import { assert } from "./assert";
import { UsedBits } from "./bits-manipulation";
import { sinkDelegate } from "./sinks";
import { ChunksHelper, cachedChunk, readRequest, BlockingQueue } from "./chunks";
import { CipherConfig, SinkDownloadConfig, SinkUploadConfig } from './config';
import { PbIndexFile, PbBootloaderFile, PbFilePointer, GenDescString, BootloaderDescription, ParseDescString } from "../protobuf";
import { MessageType, messageTypeRegistry, UnknownMessage } from '../protobuf/gen/typeRegistry';
import { EncoderType, DecoderType, SinkType } from './common-types';
import { NewCipherConfigFromPassword } from "./encryption"
import { GetPercentageString } from "./utils";
import path from 'path';
import fs from "fs";
import os from "os";
import crypto from 'crypto';
import debug from 'debug';
import _, { toArray } from "lodash";
import * as rx from "rxjs"

const debugLogger = debug('jpeg:file');

// const BOOTLOADER_APPROXIMATELY_SIZE = 256;

class BaseFile {
  constructor() { }

  async uploadBuffer(buf: Buffer, uploadConfig: SinkUploadConfig, uploadMsg: string) {
    const { filePtrs } = await sinkDelegate.UploadMultiple(() => buf, 1, uploadConfig, uploadMsg);
    assert(filePtrs.length === 1);
    return filePtrs[0];
  }

  async upload<T extends UnknownMessage>(msg: T, uploadConfig: SinkUploadConfig, uploadMsg: string) {
    const buf = Buffer.from(messageTypeRegistry.get(msg.$type)!.encode(msg).finish());
    return this.uploadBuffer(buf, uploadConfig, uploadMsg);
  }

  async download<T extends UnknownMessage>(msgTyp: MessageType, ptr: PbFilePointer, downloadConfig: SinkDownloadConfig) {
    const buf = await sinkDelegate.DownloadSingle(ptr, downloadConfig);
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
    const indexFilePtr = await this.upload(indexFile, uploadConfig, "indexFile");
    this.log("Gen result: ", indexFilePtr);
    return indexFilePtr;
  }

  DownloadChunksWithWorkerPool(chunkIndexes: number[], downloadConfig: SinkDownloadConfig) {
    if (chunkIndexes.length === 0) {
      return rx.of({
        decoded: Buffer.alloc(0),
        index: 0,
      });
    }
    const targetChunks = _.pullAt(this.indexFile.chunks, chunkIndexes);
    return sinkDelegate.DownloadMultiple(targetChunks, downloadConfig).pipe(
      // from index number in download sequences to index number in the file chunks
      rx.map(chunk => {
        return {
          decoded: chunk.decoded,
          index: chunkIndexes[chunk.index],
        };
      })
    );
  }
}

class BootloaderFile extends BaseFile {
  private log = debugLogger.extend('bootloader');

  public blFile: PbBootloaderFile;
  public indexFile: IndexFile;
  public dataDownloadConfig: SinkDownloadConfig;
  public helper: ChunksHelper;

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
    file.indexFile = await IndexFile.CreateForDownload(blFile.indexFileHead!, dataDownloadConfig);
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
    const bootloaderFilePtr = await this.upload(blFile, uploadConfig, "bootloaderFile");
    return GenDescString(bootloaderFilePtr, blPassword);
  }

  async Read(n: number, pos: number = 0) {
    const request = {
      start: pos,
      end: pos + n,
    }
    const source$ = this.Readv([request]);
    return await rx.firstValueFrom(source$);
  }

  Readv(requests: readRequest[]) {
    if (requests.length === 0) {
      return rx.of(Buffer.alloc(0));
    }
    const helper = new ChunksHelper(this.blFile.fileSize, this.blFile.chunkSize, requests);
    this.log("requests/targetReadChunkIndexes", requests, helper.targetReadChunkIndexes);
    return this.indexFile.DownloadChunksWithWorkerPool(
      helper.targetReadChunkIndexes,
      this.dataDownloadConfig,
    ).pipe(
      rx.map((chunk: cachedChunk) => {
        return rx.of(...helper.onNewChunks([chunk]));
      }),
      rx.mergeAll(),
    );
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
    maskPhotoFilePath: string = "",
    usedBitsString: string = "",
    sleepInterval: number = 0,
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

    const usedBits = usedBitsString ? UsedBits.fromString(usedBitsString) : null;
    this.blUploadConfig = new SinkUploadConfig(
      usedBits, // usedBits
      NewCipherConfigFromPassword(this.blPassword),
      concurrency,
      validate,
      maskPhotoFilePath, // maskPhotoFilePath
      EncoderType.jpegjsEncoder,
      sinkType, // sinkType
      null,
      0,
    );
    this.dataUploadConfig = new SinkUploadConfig(
      usedBits, // usedBits
      new CipherConfig("aes-128-gcm", this.aesKey, this.aesIv),
      concurrency,
      validate,
      maskPhotoFilePath, // maskPhotoFilePath
      EncoderType.jpegjsEncoder,
      sinkType, // sinkType
      null,
      sleepInterval,
    );
    this.log(
      "Upload start with filePath/chunkSize/concurrency/validate/sinkType/maskPhoto:",
      filePath, chunkSize, concurrency, validate, SinkType[sinkType], maskPhotoFilePath,
    )
  }

  async GenerateDescription() {
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
    const { filePtrs, totalUploadSize } = await sinkDelegate.UploadMultiple(
      readChunk,
      this.n_chunks,
      this.dataUploadConfig,
      "chunks"
    );

    // step 2. create/upload index file(s)
    const indexFile = new IndexFile();
    const indexFileHead = await indexFile.GenIndexFile(filePtrs, this.dataUploadConfig);

    // step 2. create/upload bootloader file
    const bootloaderFile = new BootloaderFile()
    const descStr = await bootloaderFile.GenDescription(
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
    this.log(`Upload finish, fileSize/uploadSize:${this.fileSize}/${totalUploadSize}`,
      GetPercentageString(this.fileSize, totalUploadSize));
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
    assert(this.blDesc.password.byteLength > 0 || password?.byteLength > 0,
      "no password found in desc or input");
    this.log("Download start with desc: ", this.blDesc);

    this.blDownloadConfig = new SinkDownloadConfig(
      UsedBits.fromString(this.blDesc.fp.usedBits),
      NewCipherConfigFromPassword(this.blDesc.password || password),
      concurrency,
      DecoderType.wasmDecoder,
      null, // abort signal
    );
  }

  static async Create(descStr: string, concurrency: number, password?: Uint8Array) {
    const f = new DownloadFile(descStr, concurrency, password);
    const { blDesc, blDownloadConfig } = f;
    f.bl = await BootloaderFile.CreateForDownload(blDesc.fp, blDownloadConfig);
    return f;
  }

  async Read(n: number, pos: number = 0) {
    return await this.bl.Read(n, pos);
  }

  Readv(requests: readRequest[]) {
    return this.bl.Readv(requests);
  }

  ReadvBlockingQueue(requests: readRequest[]) {
    const source$ = this.bl.Readv(requests);
    return new BlockingQueue(source$);
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
