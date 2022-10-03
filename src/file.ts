import { assert } from "./assert";
import { UsedBits } from "./bits-manipulation";
import { Tasker } from "./tasker";
import { sinkDelegate } from "./sinks";
import { CipherConfig, SinkDownloadConfig, SinkUploadConfig } from './config';
import { PbIndexFile, PbBootloaderFile, PbBootloaderDescription, PbFilePointer } from "../protobuf";
import { MessageType, messageTypeRegistry, UnknownMessage } from '../protobuf/gen/typeRegistry';
import { DecoderType } from './jpeg-decoder/index';
import { EncoderType } from './jpeg-encoder/index';
import { SinkType } from './sinks/base';
import { Task } from './tasker';
import { NewCipherConfigFromPassword } from "./encryption"
import path from 'path';
import fs from "fs";
import os from "os";
import crypto from 'crypto';
import debug from 'debug';
import _ from "lodash";

const debugLogger = debug('jpeg:file');

// const BOOTLOADER_APPROXIMATELY_SIZE = 256;

class BaseFile {
  constructor() { }

  async uploadBuffer(buf: Buffer, uploadConfig: SinkUploadConfig) {
    const { url, usedBits } = await sinkDelegate.Upload(buf, uploadConfig);
    const filePtr: PbFilePointer = {
      $type: PbFilePointer.$type,
      size: buf.byteLength,
      url,
      usedBits: usedBits.toString(),
    }
    return filePtr;
  }

  async upload<T extends UnknownMessage>(msg: T, uploadConfig: SinkUploadConfig) {
    const buf = Buffer.from(messageTypeRegistry.get(msg.$type)!.encode(msg).finish());
    return this.uploadBuffer(buf, uploadConfig);
  }

  async download<T extends UnknownMessage>(msgTyp: MessageType, ptr: PbFilePointer, downloadConfig: SinkDownloadConfig) {
    const buf = await sinkDelegate.DownloadSingleFile(ptr, downloadConfig)
    return msgTyp.decode(buf) as T;
  }
}

class RawDataFile extends BaseFile {
  constructor() {
    super();
  }
}

class IndexFile extends BaseFile {
  private log = debugLogger.extend('index');
  public indexFile: PbIndexFile;

  constructor() {
    super();
  }

  static async CreateForDownload(indexFilePointer: PbFilePointer, downloadConfig: SinkDownloadConfig) {
    const file = new IndexFile();
    file.indexFile = await file.download<PbIndexFile>(PbIndexFile, indexFilePointer, downloadConfig);
    file.log("create indexFilePointer/indexFile:", indexFilePointer, file.indexFile);
    return file;
  }

  async GenIndexFile(chunks: PbFilePointer[], uploadConfig: SinkUploadConfig) {
    const indexFile: PbIndexFile = {
      $type: PbIndexFile.$type,
      chunks: chunks,
      ended: true,
      next: undefined,
    }
    this.log("Gen from:", indexFile);
    const indexFilePtr = await this.upload(indexFile, uploadConfig);
    this.log("Gen result: ", indexFilePtr);
    return indexFilePtr;
  }

  // async DownloadAllChunksWithWorkerPool(indexFilePointer: PbFilePointer, downloadConfig: SinkDownloadConfig) {
  //   const indexFile = await this.download<PbIndexFile>(PbIndexFile, indexFilePointer, downloadConfig);
  //   this.log("DownloadAllChunksWithWorkerPool from: ", indexFile);
  //   const results = await sinkDelegate.DownloadMultipleFiles(indexFile.chunks, downloadConfig);
  //   const fileBuf = Buffer.concat(results);
  //   const hash = crypto.createHash("md5");
  //   hash.update(fileBuf);
  //   this.log("DownloadAllChunksWithWorkerPool results md5sum: ", hash.digest("hex"));
  //   return fileBuf;
  // }

  async DownloadChunksWithWorkerPool(chunkIndexes: number[], downloadConfig: SinkDownloadConfig) {
    const targetChunks = _.pullAt(this.indexFile.chunks, chunkIndexes);
    return await sinkDelegate.DownloadMultipleFiles(targetChunks, downloadConfig);
  }
}

class BootloaderFile extends BaseFile {
  private log = debugLogger.extend('bootloader');

  public blFile: PbBootloaderFile;
  public dataDownloadConfig: SinkDownloadConfig;

  constructor() {
    super();
  }

  static async CreateForDownload(blFilePointer: PbFilePointer, downloadConfig: SinkDownloadConfig) {
    const file = new BootloaderFile();
    const blFile = await file.download<PbBootloaderFile>(PbBootloaderFile, blFilePointer, downloadConfig);
    const dataDownloadConfig = new SinkDownloadConfig(
      UsedBits.fromString(blFile.indexFileHead!.usedBits), // usedBits
      new CipherConfig("aes-128-gcm", Buffer.from(blFile.aesKey), Buffer.from(blFile.aesIv)),
      downloadConfig.concurrency,
      DecoderType.wasmDecoder, // decoder
      null, // abort signal
    );
    file.blFile = blFile;
    file.dataDownloadConfig = dataDownloadConfig;
    file.log("create ptr/file/dataDownloadConfig", blFilePointer, blFile, dataDownloadConfig);
    return file;
  }

  // addPadding() {
  //   const buf = this.pbClass.encode(this.pbClass.create(this.configObj)).finish();
  //   assert(buf.byteLength <= BOOTLOADER_APPROXIMATELY_SIZE);
  //   const paddingLength = BOOTLOADER_APPROXIMATELY_SIZE - buf.byteLength;
  //   this.configObj.padding = crypto.randomBytes(paddingLength);
  // }

  async GenDescription(
    fileSize: number,
    chunkSize: number,
    fileName: string,
    aesKey: Uint8Array,
    aesIv: Uint8Array,
    indexFileHead: PbFilePointer,
    uploadConfig: SinkUploadConfig,
    blPassword: Uint8Array,
  ) {
    const blFile: PbBootloaderFile = {
      $type: PbBootloaderFile.$type,
      fileSize,
      chunkSize,
      fileName,
      aesKey,
      aesIv,
      indexFileHead,
    };
    const bootloaderFilePtr = await this.upload(blFile, uploadConfig);
    this.log("Gen from: ", bootloaderFilePtr);

    const { sinkType, id } = sinkDelegate.GetTypeAndID(bootloaderFilePtr.url);
    const blDesc: PbBootloaderDescription = {
      $type: PbBootloaderDescription.$type,
      id,
      sinkType,
      size: bootloaderFilePtr.size,
      usedBits: bootloaderFilePtr.usedBits,
      password: blPassword,
    }
    this.log("Gen result: ", blDesc);
    return Buffer.from(PbBootloaderDescription.encode(blDesc).finish()).toString('hex');
  }

  async Read(n: number, pos: number = 0) {
    const indexFile = await IndexFile.CreateForDownload(this.blFile.indexFileHead!, this.dataDownloadConfig);
    const helper = new ChunksHelper(this.blFile.fileSize, this.blFile.chunkSize);
    const targetChunkIndexes = helper.caclulateReadChunkIndexes(pos, n + pos);
    this.log("Read n/pos/targetChunkIndexes", n, pos, targetChunkIndexes)
    const chunks = await indexFile.DownloadChunksWithWorkerPool(
      targetChunkIndexes,
      this.dataDownloadConfig,
    );
    return helper.concatAndTrimBuffer(chunks, targetChunkIndexes, pos, n + pos);
  }
}

const realfs = fs;

export class UploadFile {
  private log = debugLogger.extend('upload');

  public fileSize: number;
  public fileName: string;
  public fd: number;
  public n_chunks: number;
  public lastChunkSize: number;
  public aesKey: Buffer = crypto.randomBytes(16);
  public aesIv: Buffer = crypto.randomBytes(12);
  public blPassword: Uint8Array = crypto.randomBytes(8);
  public uploadConcurrency = 10;
  public downloadConcurrency = 50;
  public blUploadConfig: SinkUploadConfig;
  public dataUploadConfig: SinkUploadConfig;

  constructor(
    public filePath: string,
    public chunkSize: number,
    public concurrency: number,
    public validate: boolean,
    public fs: any = realfs /* support memfs inject */,
    public sinkType: SinkType = SinkType.unknown,
  ) {
    assert(chunkSize > 0);

    const stat = this.fs.statSync(filePath);
    const fileSize = stat.size;
    if (fileSize === 0) {
      return;
    }
    this.fileSize = fileSize;
    this.fileName = path.parse(filePath).base;
    this.fd = this.fs.openSync(filePath, "r");

    this.n_chunks = Math.ceil(fileSize / chunkSize);
    this.lastChunkSize = fileSize % chunkSize;

    this.blUploadConfig = new SinkUploadConfig(
      null, // usedBits
      NewCipherConfigFromPassword(this.blPassword),
      concurrency,
      validate,
      "", // maskPhotoFilePath
      EncoderType.wasmEncoder,
      sinkType, // sinkType
    );
    this.dataUploadConfig = new SinkUploadConfig(
      null, // usedBits
      new CipherConfig("aes-128-gcm", this.aesKey, this.aesIv),
      concurrency,
      validate,
      "", // maskPhotoFilePath
      EncoderType.wasmEncoder,
      sinkType, // sinkType
    );
  }

  async GenerateDescription() {
    // step 1. upload file data chunks, get file chunk ptr array
    const tasks: Task<PbFilePointer>[] = [];
    for (let i = 0; i < this.n_chunks; i++) {
      const fn = async () => {
        let chunk = Buffer.alloc(this.chunkSize);
        const bytesRead = this.fs.readSync(
          this.fd,
          chunk,
          0, // offset
          this.chunkSize, //length
          this.chunkSize * i, // position
        );
        if (bytesRead < this.chunkSize) {
          chunk = chunk.slice(0, bytesRead);
        }
        const file = new RawDataFile();
        const result = await file.uploadBuffer(chunk, this.dataUploadConfig);
        this.log(`Finish upload task ${i}/${this.n_chunks}, size: ${chunk.byteLength}`);
        return result;
      }
      tasks.push(fn);
    }
    const uploadTasker = new Tasker<PbFilePointer>(tasks, this.dataUploadConfig.concurrency);
    await uploadTasker.done;

    // step 2. create/upload index file(s)
    const indexFile = new IndexFile();
    const indexFileHead = await indexFile.GenIndexFile(uploadTasker.results, this.dataUploadConfig);

    // step 2. create/upload bootloader file
    const bootloaderFile = new BootloaderFile()
    const descHex = await bootloaderFile.GenDescription(
      this.fileSize,
      this.chunkSize,
      this.fileName,
      this.aesKey,
      this.aesIv,
      indexFileHead,
      this.blUploadConfig,
      this.blPassword,
    );
    return descHex;
  }
}

export class DownloadFile {
  private log = debugLogger.extend('download');

  public blDesc: PbBootloaderDescription;
  public blDownloadConfig: SinkDownloadConfig;
  public bl: BootloaderFile;

  constructor(descHex: string, concurrency: number) {
    const buf = Buffer.from(descHex, "hex");
    this.blDesc = PbBootloaderDescription.decode(buf);
    this.log("Desc: ", this.blDesc);

    this.blDownloadConfig = new SinkDownloadConfig(
      UsedBits.fromString(this.blDesc.usedBits), // usedBits
      NewCipherConfigFromPassword(this.blDesc.password),
      concurrency,
      DecoderType.wasmDecoder,
      null, // abort signal
    );
  }

  static async Create(descHex: string, concurrency: number) {
    const f = new DownloadFile(descHex, concurrency);
    const { blDesc, blDownloadConfig } = f;
    const blFileChunk: PbFilePointer = {
      $type: PbFilePointer.$type,
      size: blDesc.size,
      url: sinkDelegate.ExpandIDToUrl(blDesc.sinkType, blDesc.id),
      usedBits: blDesc.usedBits,
    }
    f.bl = await BootloaderFile.CreateForDownload(blFileChunk, blDownloadConfig);
    return f;
  }

  async Read(n: number, pos: number = 0) {
    return await this.bl.Read(n, pos);
  }
  
  async Readall() {
    return this.Read(this.bl.blFile.fileSize);
  }

  async SaveToFile(outputFilePath: string) {
    const buf = await this.Readall();
    if (!outputFilePath) {
      outputFilePath = path.join(os.tmpdir(), this.bl.blFile.fileName);
    }
    fs.writeFileSync(outputFilePath, buf);
  }
}

export class ChunksHelper {
  constructor(
    public fileSize: number,
    public chunkSize: number
  ) {
    assert(chunkSize > 0 && chunkSize <= fileSize, "invalid params");
  }

  // range is [start, end) 
  caclulateReadChunkIndexes(start: number = 0, end: number = -1) {
    if (end === -1) {
      end = this.fileSize;
    }
    assert(
      start >= 0 &&
      start <= end &&
      end <= this.fileSize,
      "invalid params",
    );
    const startIndex = Math.floor(start / this.chunkSize);
    // end_chunk is exclusive
    const endIndex = Math.ceil(end / this.chunkSize);
    return _.range(startIndex, endIndex);
  }

  concatAndTrimBuffer(bufs: Buffer[], chunkIndexes: number[], start: number, end: number): Buffer {
    if (bufs.length === 0) {
      return Buffer.alloc(0);
    }
    assert(bufs.length === chunkIndexes.length, "invalid params");
    const buf = Buffer.concat(bufs);
    const startOffset = start - chunkIndexes[0] * this.chunkSize;
    const endOffset = startOffset + (end - start);
    return buf.slice(startOffset, endOffset);
  }
}
