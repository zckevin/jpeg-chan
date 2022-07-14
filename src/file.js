import path from 'path';
import fs from "fs";
import crypto from 'crypto';
import { assert } from "./assert.js";
import { UsedBits } from "./bits-manipulation.js";
import { Tasker } from "./tasker.v2.js";
import { pbFactory } from "./formats/pb.js";
import { sinkDelegate } from "./sinks/delegate.js";
import { CipherConfig, SinkDownloadConfig, SinkUploadConfig } from './config.js';

// const BOOTLOADER_APPROXIMATELY_SIZE = 256;

class BaseFile {
  constructor() {
  }

  encodePb(pb, pbClass) {
    if (!pbClass) {
      assert(this.pbClass);
      pbClass = this.pbClass;
    }
    const err = pbClass.verify(pb);
    if (err) {
      throw new Error(err);
    }
    return pbClass.encode(pbClass.create(pb)).finish();
  }

  /**
   * @param {Buffer} buf 
   * @param {SinkUploadConfig} uploadConfig 
   * @returns 
   */
  async upload(buf, uploadConfig) {
    // const buf = this.encodePb(pb)
    const { url, usedBits } = await sinkDelegate.Upload(buf, uploadConfig);
    return {
      size: buf.byteLength,
      url,
      usedBits: usedBits.toString(),
    }
  }

  /**
   * @param {*} filePointer 
   * @param {SinkDownloadConfig} downloadConfig 
   * @returns
   */
  async download(filePointer, downloadConfig) {
    // assert(typeof filePointer === pbFactory.PbFilePointer)
    assert(this.pbClass);
    const buf = await sinkDelegate.Download(filePointer.url, filePointer.size, downloadConfig)
    return this.pbClass.decode(buf);
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
    this.pbClass = pbFactory.PbIndexFile;
  }

  /**
   * @param {Array<Object>} fileChunkPointers 
   * @param {SinkUploadConfig} uploadConfig 
   * @returns 
   */
  async GenFilePointer(fileChunkPointers, uploadConfig) {
    const chunks = fileChunkPointers.map(ptr => {
      assert(!pbFactory.PbFilePointer.verify(ptr));
      return pbFactory.PbFilePointer.create(ptr);
    });
    const indexFileConfig = {
      ended: true,
      chunks,
    };
    console.log(indexFileConfig)
    const filePointer = await this.upload(this.encodePb(indexFileConfig), uploadConfig);
    assert(!pbFactory.PbFilePointer.verify(filePointer));
    console.log("indexFile filePointer", filePointer);
    return pbFactory.PbFilePointer.create(filePointer);
  }

  async Download(indexFilePointer, downloadConfig) {
    const indexFile = await this.download(indexFilePointer, downloadConfig);
    console.log("IndexFile", indexFile);
    const tasks = indexFile.chunks.map(chunk => async () => {
      return await sinkDelegate.Download(
        chunk.url,
        chunk.size,
        downloadConfig.cloneWithNewUsedBits(new UsedBits(chunk.usedBits)),
      );
    });
    const downloadTasker = new Tasker(tasks, 50);
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
  constructor() {
    super();
    this.pbClass = pbFactory.PbBootloaderFile;
  }

  // addPadding() {
  //   const buf = this.pbClass.encode(this.pbClass.create(this.configObj)).finish();
  //   assert(buf.byteLength <= BOOTLOADER_APPROXIMATELY_SIZE);
  //   const paddingLength = BOOTLOADER_APPROXIMATELY_SIZE - buf.byteLength;
  //   this.configObj.padding = crypto.randomBytes(paddingLength);
  // }

  async GenDescription(fileSize, chunkSize, fileName, indexFile, aesKey, aesIV, uploadConfig, blPassword) {
    const blFileconfig = {
      fileSize,
      chunkSize,
      fileName,
      indexFile,
      aesKey,
      aesIV,
    };
    const bootloaderFile = await this.upload(this.encodePb(blFileconfig), uploadConfig);
    const { type, id } = sinkDelegate.GetTypeAndID(bootloaderFile.url);
    const blDescConfig = {
      type,
      size: bootloaderFile.size,
      id,
      usedBits: bootloaderFile.usedBits,
      password: blPassword,
    };
    console.log("bootloaderDesc config", blDescConfig)
    const descBuf = this.encodePb(blDescConfig, pbFactory.PbBootloaderDescription);
    return descBuf.toString('hex');
  }

  async Download(blFilePointer, downloadConfig) {
    const blFileConfig = await this.download(blFilePointer, downloadConfig);
    console.log(blFileConfig);
    this.blFileConfig = blFileConfig;
    const dataDownloadConfig = new SinkDownloadConfig (
      new UsedBits(blFileConfig.indexFile.usedBits), // usedBits
      new CipherConfig("aes-128-gcm", blFileConfig.aesKey, blFileConfig.aesIV),
      null, // decoder
    );
    const indexFile = new IndexFile();
    return await indexFile.Download(blFileConfig.indexFile, dataDownloadConfig);
  }
}

export class UploadFile {
  constructor(filePath, chunkSize) {
    assert(chunkSize > 0);

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    if (fileSize === 0) {
      return;
    }
    this.fileSize = fileSize;
    this.chunkSize = chunkSize;
    this.fileName = path.parse(filePath).base;
    this.fd = fs.openSync(filePath, "r");

    this.n_chunks = Math.ceil(fileSize / chunkSize);
    this.lastChunkSize = fileSize % chunkSize;

    this.aesKey = crypto.randomBytes(16);
    this.aesIV = crypto.randomBytes(12);
    this.blPassword = crypto.randomBytes(8);

    this.uploadConcurrency = 10;
    this.downloadConcurrency = 50;

    const scryptBuf = crypto.scryptSync(this.blPassword, "salt", 28);
    this.blUploadConfig = new SinkUploadConfig(
      null, // usedBits
      new CipherConfig("aes-128-gcm", scryptBuf.subarray(0, 16), scryptBuf.subarray(16, 28)),
      true, // validate
      null, // maskPhotoFilePath
      null, // encoder
    );
    this.dataUploadConfig = new SinkUploadConfig(
      null, // usedBits
      new CipherConfig("aes-128-gcm", this.aesKey, this.aesIV),
      true, // validate
      null, // maskPhotoFilePath
      null, // encoder
    );
  }

  async GenerateDescription() {
    // step 1. upload file data chunks, get file chunk ptr array
    const tasks = [];
    for (let i = 0; i < this.n_chunks; i++) {
      const fn = async () => {
        let chunk = Buffer.alloc(this.chunkSize);
        const bytesRead = fs.readSync(this.fd, chunk, {
          length: this.chunkSize,
          position: this.chunkSize * i,
        });
        if (bytesRead < this.chunkSize) {
          chunk = chunk.slice(0, bytesRead);
        }
        const file = new RawDataFile();
        return await file.upload(chunk, this.dataUploadConfig);
      }
      tasks.push(fn);
    }
    const uploadTasker = new Tasker(tasks, 10);
    await uploadTasker.done;

    // step 2. create/upload index file(s)
    const indexFile = new IndexFile();
    const indexFilePointer = await indexFile.GenFilePointer(uploadTasker.results, this.dataUploadConfig);

    // step 2. create/upload bootloader file
    const bootloaderFile = new BootloaderFile()
    const descHex = await bootloaderFile.GenDescription(
      this.fileSize,
      this.chunkSize,
      this.fileName,
      indexFilePointer,
      this.aesKey,
      this.aesIV,
      this.blUploadConfig,
      this.blPassword,
    );
    return descHex;
  }
}

export class DownloadFile {
  constructor(descHex) {
    const buf = Buffer.from(descHex, "hex");
    this.desc = pbFactory.PbBootloaderDescription.decode(buf);
    console.log(this.desc);

    const scryptBuf = crypto.scryptSync(this.desc.password, "salt", 28);
    this.blDownloadConfig = new SinkDownloadConfig(
      new UsedBits(this.desc.usedBits), // usedBits
      new CipherConfig("aes-128-gcm", scryptBuf.subarray(0, 16), scryptBuf.subarray(16, 28)),
      null, // decoder
    );
  }

  async Download(outputFilePath) {
    const blFile = new BootloaderFile();
    const blFilePtr = {
      size: this.desc.size,
      url: sinkDelegate.ExpandIDToUrl(this.desc.type, this.desc.id),
      usedBits: this.desc.usedBits,
    };
    const fileBuf = await blFile.Download(blFilePtr, this.blDownloadConfig);
    if (!outputFilePath) {
      outputFilePath = path.join("/tmp", blFile.blFileConfig.fileName);
    }
    fs.writeFileSync(outputFilePath, fileBuf);
  }
}
