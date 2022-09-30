import path from 'path';
import fs from "fs";
import crypto from 'crypto';
import { assert } from "./assert";
import { UsedBits } from "./bits-manipulation";
import { Tasker } from "./tasker";
import { sinkDelegate } from "./sinks/delegate";
import { CipherConfig, SinkDownloadConfig, SinkUploadConfig } from './config';
import {
  PbIndexFile, PbBootloaderFile, PbBootloaderDescription, PbFileChunk,
} from "../protobuf/gen/protobuf/v1/jpeg_file";
import { messageTypeRegistry, UnknownMessage } from '../protobuf/gen/typeRegistry';
import { DecoderType } from './jpeg-decoder/index';
import { EncoderType } from './jpeg-encoder/index';
import { SinkType } from './sinks/base';
import { Task } from './tasker';

// const BOOTLOADER_APPROXIMATELY_SIZE = 256;
const BOOTLOADER_SCRYPT_SALT = "tF%L6uPTJ5^hI%n63s0b";

class BaseFile {
  constructor() { }

  async uploadBuffer(buf: Buffer, uploadConfig: SinkUploadConfig) {
    const { url, usedBits } = await sinkDelegate.Upload(buf, uploadConfig);
    const fileChunk: PbFileChunk = {
      $type: PbFileChunk.$type,
      size: buf.byteLength,
      url,
      usedBits: usedBits.toString(),
    }
    return fileChunk;
  }

  async upload<T extends UnknownMessage>(msg: T, uploadConfig: SinkUploadConfig) {
    const buf = Buffer.from(messageTypeRegistry.get(msg.$type)!.encode(msg).finish());
    return this.uploadBuffer(buf, uploadConfig);
  }

  async download<T extends UnknownMessage>(filePointer: PbFileChunk, downloadConfig: SinkDownloadConfig): Promise<T> {
    // const buf = await sinkDelegate.Download(filePointer.url, filePointer.size, downloadConfig)
    // return this.pbClass.decode(buf);
    return null as any;
  }
}

class RawDataFile extends BaseFile {
  constructor() {
    super();
  }
}

class IndexFile extends BaseFile {
  constructor() {
    super();
  }

  async GenFileChunk(chunks: PbFileChunk[], uploadConfig: SinkUploadConfig) {
    const indexFile: PbIndexFile = {
      $type: PbIndexFile.$type,
      chunks: chunks,
      ended: true,
      next: undefined,
    }
    console.log(indexFile)
    const chunk = await this.upload(indexFile, uploadConfig);
    console.log("indexFile fileChunk", chunk);
    return chunk;
  }

  async Download(indexFilePointer: PbFileChunk, downloadConfig: SinkDownloadConfig) {
    const indexFile = await this.download<PbIndexFile>(indexFilePointer, downloadConfig);
    console.log("IndexFile", indexFile);
    const n_chunks = indexFile.chunks.length;
    const tasks = indexFile.chunks.map((chunk, index) => async () => {
      const result = await sinkDelegate.Download(
        chunk.url,
        chunk.size,
        downloadConfig.cloneWithNewUsedBits(UsedBits.fromString(chunk.usedBits)),
      );
      console.log(`Tasker: finish download task ${index}/${n_chunks}: ${chunk.url}(${chunk.size})`);
      return result;
    });
    const downloadTasker = new Tasker(tasks, downloadConfig.concurrency);
    await downloadTasker.done;
    console.log(downloadTasker.results);

    const fileBuf = Buffer.concat(downloadTasker.results);
    const hash = crypto.createHash("md5");
    hash.update(fileBuf);
    console.log(hash.digest("hex"));
    return fileBuf;
  }
}

class BootloaderFile extends BaseFile {
  public blFile: PbBootloaderFile;

  constructor() {
    super();
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
    indexFileHead: PbFileChunk,
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
    const bootloaderFile = await this.upload(blFile, uploadConfig);
    console.log(bootloaderFile)
    const { sinkType, id } = sinkDelegate.GetTypeAndID(bootloaderFile.url);
    const blDesc: PbBootloaderDescription = {
      $type: PbBootloaderDescription.$type,
      id,
      sinkType,
      size: bootloaderFile.size,
      usedBits: bootloaderFile.usedBits,
      password: blPassword,
    }
    console.log("bootloaderDesc config", blDesc)
    return Buffer.from(PbBootloaderDescription.encode(blDesc).finish()).toString('hex');
  }

  async Download(blFileChunk: PbFileChunk, downloadConfig: SinkDownloadConfig) {
    const blFile = await this.download<PbBootloaderFile>(blFileChunk, downloadConfig);
    this.blFile = blFile;
    console.log(blFile);
    const dataDownloadConfig = new SinkDownloadConfig(
      UsedBits.fromString(blFile.indexFileHead!.usedBits), // usedBits
      new CipherConfig("aes-128-gcm", Buffer.from(blFile.aesKey), Buffer.from(blFile.aesIv)),
      downloadConfig.concurrency,
      DecoderType.wasmDecoder, // decoder
    );
    const indexFile = new IndexFile();
    return await indexFile.Download(blFile.indexFileHead!, dataDownloadConfig);
  }
}

const realfs = fs;

export class UploadFile {
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
    public fs = realfs /* support memfs inject */,
    public sinkType: SinkType = SinkType.random,
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

    const scryptBuf = crypto.scryptSync(this.blPassword, BOOTLOADER_SCRYPT_SALT, 28);
    this.blUploadConfig = new SinkUploadConfig(
      null, // usedBits
      new CipherConfig("aes-128-gcm", scryptBuf.subarray(0, 16), scryptBuf.subarray(16, 28)),
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
    const tasks: Task<PbFileChunk>[] = [];
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
        console.log(`Tasker: finish upload task ${i}/${this.n_chunks}, size: ${chunk.byteLength}`);
        return result;
      }
      tasks.push(fn);
    }
    const uploadTasker = new Tasker<PbFileChunk>(tasks, this.dataUploadConfig.concurrency);
    await uploadTasker.done;

    // step 2. create/upload index file(s)
    const indexFile = new IndexFile();
    const indexFileHead = await indexFile.GenFileChunk(uploadTasker.results, this.dataUploadConfig);

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
  public blDesc: PbBootloaderDescription;
  public blDownloadConfig: SinkDownloadConfig;

  constructor(descHex: string, concurrency: number) {
    const buf = Buffer.from(descHex, "hex");
    this.blDesc = PbBootloaderDescription.decode(buf);
    console.log(this.blDesc);

    const scryptBuf = crypto.scryptSync(this.blDesc.password, BOOTLOADER_SCRYPT_SALT, 28);
    this.blDownloadConfig = new SinkDownloadConfig(
      UsedBits.fromString(this.blDesc.usedBits), // usedBits
      new CipherConfig("aes-128-gcm", scryptBuf.subarray(0, 16), scryptBuf.subarray(16, 28)),
      concurrency,
      DecoderType.wasmDecoder,
    );
  }

  async Download(outputFilePath: string) {
    const blFile = new BootloaderFile();
    const blFileChunk: PbFileChunk = {
      $type: PbFileChunk.$type,
      size: this.blDesc.size,
      url: sinkDelegate.ExpandIDToUrl(this.blDesc.sinkType, this.blDesc.id),
      usedBits: this.blDesc.usedBits,
    }
    console.log(blFileChunk)
    const buf = await blFile.Download(blFileChunk, this.blDownloadConfig);
    if (!outputFilePath) {
      outputFilePath = path.join("/tmp", blFile.blFile.fileName);
    }
    fs.writeFileSync(outputFilePath, buf);
  }
}