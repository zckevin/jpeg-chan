import { assert } from "./assert";
import { UsedBits } from "./bits-manipulation";
import { sinkDelegate } from "./sinks";
import { CipherConfig, SinkDownloadConfig, SinkUploadConfig } from './config';
import { PbIndexFile, PbBootloaderFile, PbFilePointer, GenDescString, ParseDescString, BootloaderDescription } from "../protobuf";
import { MessageType, messageTypeRegistry, UnknownMessage } from '../protobuf/gen/typeRegistry';
import { EncoderType, DecoderType, SinkType } from './common-types';
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
    const filePtrs = await sinkDelegate.UploadMultiple(() => buf, 1, uploadConfig);
    return filePtrs[0];
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
      // TODO: support split index file into multiple files
      ended: true,
      next: undefined,
    }
    this.log("Gen from:", indexFile);
    const indexFilePtr = await this.upload(indexFile, uploadConfig);
    this.log("Gen result: ", indexFilePtr);
    return indexFilePtr;
  }

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
    useShortDesc: boolean,
    fileSize: number,
    chunkSize: number,
    fileName: string,
    aesKey: Uint8Array,
    aesIv: Uint8Array,
    checksum: Uint8Array,
    indexFileHead: PbFilePointer,
    uploadConfig: SinkUploadConfig,
    blPassword: Uint8Array,
  ) {
    const blFile: PbBootloaderFile = {
      $type: PbBootloaderFile.$type,
      indexFileHead,
      fileSize,
      chunkSize,
      fileName,
      aesKey,
      aesIv,
      checksum,
    };
    this.log("Gen from: ", blFile);
    const bootloaderFilePtr = await this.upload(blFile, uploadConfig);

    const { sinkType, id } = sinkDelegate.GetTypeAndID(bootloaderFilePtr.url);
    const blDesc: BootloaderDescription = {
      id,
      sinkType,
      size: bootloaderFilePtr.size,
      usedBits: UsedBits.fromString(bootloaderFilePtr.usedBits),
      password: blPassword,
    }
    this.log("Gen result: ", blDesc);
    return GenDescString(blDesc, useShortDesc);
  }

  async Read(n: number, pos: number = 0) {
    const indexFile = await IndexFile.CreateForDownload(this.blFile.indexFileHead!, this.dataDownloadConfig);
    const helper = new ChunksHelper(this.blFile.fileSize, this.blFile.chunkSize);
    const targetChunkIndexes = helper.caclulateReadChunkIndexes(pos, n + pos);
    this.log("read_n/pos/targetChunkIndexes", n, pos, targetChunkIndexes)
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
  public checksum: crypto.Hash;
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
    this.checksum = crypto.createHash("sha256");

    this.blUploadConfig = new SinkUploadConfig(
      null, // usedBits
      NewCipherConfigFromPassword(this.blPassword),
      concurrency,
      validate,
      "", // maskPhotoFilePath
      EncoderType.jpegjsEncoder,
      sinkType, // sinkType
      null,
    );
    this.dataUploadConfig = new SinkUploadConfig(
      null, // usedBits
      new CipherConfig("aes-128-gcm", this.aesKey, this.aesIv),
      concurrency,
      validate,
      "", // maskPhotoFilePath
      EncoderType.jpegjsEncoder,
      sinkType, // sinkType
      null,
    );
    this.log(
      "Upload start with filePath/chunkSize/concurrency/validate/sinkType:",
      filePath, chunkSize, concurrency, validate, SinkType[sinkType],
    )
  }

  async GenerateDescription(useShortDesc = false) {
    // step 1. upload file data chunks, get file chunk ptr array
    const readChunk = (i: number) => {
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
      this.checksum.update(chunk);
      return chunk;
    }
    const uploadResults = await sinkDelegate.UploadMultiple(
      readChunk,
      this.n_chunks,
      this.dataUploadConfig
    );

    // step 2. create/upload index file(s)
    const indexFile = new IndexFile();
    const indexFileHead = await indexFile.GenIndexFile(uploadResults, this.dataUploadConfig);

    // step 2. create/upload bootloader file
    const bootloaderFile = new BootloaderFile()
    const descStr = await bootloaderFile.GenDescription(
      useShortDesc,
      this.fileSize,
      this.chunkSize,
      this.fileName,
      this.aesKey,
      this.aesIv,
      this.checksum.digest(),
      indexFileHead,
      this.blUploadConfig,
      this.blPassword,
    );
    this.log("Upload finish with descStr:", descStr);
    return descStr;
  }
}

export class DownloadFile {
  private log = debugLogger.extend('download');

  public blDesc: BootloaderDescription;
  public blDownloadConfig: SinkDownloadConfig;
  public bl: BootloaderFile;

  constructor(descStr: string, concurrency: number, password: Uint8Array) {
    this.blDesc = ParseDescString(descStr);
    assert(this.blDesc.password || password, "no password found in desc or input");
    this.log("Download start with desc: ", this.blDesc);

    this.blDownloadConfig = new SinkDownloadConfig(
      this.blDesc.usedBits,
      NewCipherConfigFromPassword(this.blDesc.password || password),
      concurrency,
      DecoderType.wasmDecoder,
      null, // abort signal
    );
  }

  static async Create(descStr: string, concurrency: number, password?: Uint8Array) {
    const f = new DownloadFile(descStr, concurrency, password);
    const { blDesc, blDownloadConfig } = f;
    const blFileChunk: PbFilePointer = {
      $type: PbFilePointer.$type,
      size: blDesc.size,
      url: sinkDelegate.ExpandIDToUrl(blDesc.sinkType, blDesc.id),
      usedBits: blDesc.usedBits.toString(),
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
    const hash = crypto.createHash("sha256").update(buf).digest();
    if (!hash.equals(this.bl.blFile.checksum)) {
      throw new Error("checksum mismatch");
    }
    this.log("Download finish: SHA256 Checksum checked,", hash.toString("hex"));
    console.log("SaveToFile", outputFilePath);
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
