import protobufjs from "protobufjs";
import { fileURLToPath } from 'url';
import path from 'path';
import fs from "fs";
import crypto from 'crypto';
import { assert } from "../assert.js";
import { BilibiliSink } from "../sinks/bilibili.js";
import { UsedBits } from "../bits-manipulation.js";
import { Tasker } from "../tasker.v2.js";

const BOOTLOADER_APPROXIMATELY_SIZE = 256;

let PbBootloaderDescription;
let PbBootloaderFile;
let PbIndexFile;
let PbFileChunk;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
protobufjs.load(path.join(__dirname, "jpegFile.proto"), (err, root) => {
  if (err)
    throw err;

  PbBootloaderDescription = root.lookupType("BootloaderDescription");
  PbBootloaderFile = root.lookupType("BootloaderFile");
  PbIndexFile = root.lookupType("IndexFile");
  PbFileChunk = root.lookupType("FileChunk");
});

class BaseFile {
  constructor(sink) {
    // this.usedBits = new UsedBits(1, 5);
    // this.sink = new BilibiliSink(this.usedBits);
    this.sink = sink;
    // this.validate = true;
  }

  encodePb(pbClass, pb) {
    const err = pbClass.verify(pb);
    if (err) {
      throw new Error(err);
    }
    return pbClass.encode(pbClass.create(pb)).finish();
  }

  async upload(pb, options = {}) {
    assert(this.pbClass);
    const buf = this.encodePb(this.pbClass, pb)
    const url = await this.sink.Upload(buf, { ...options, validate: true });
    return {
      size: buf.byteLength,
      url,
      usedBits: this.sink.usedBits.toString(),
    }
  }

  async download(fileChunk, options = {}) {
    // assert(typeof fileChunk === PbFileChunk)
    assert(this.pbClass);
    const buf = await this.sink.Download(fileChunk.url, fileChunk.size, options)
    return this.pbClass.decode(buf);
  }
}

class IndexFile extends BaseFile {
  constructor(sink) {
    super(sink);
    this.pbClass = PbIndexFile;
  }

  async GenFileChunk(fileChunkObjs) {
    const chunks = fileChunkObjs.map(obj => {
      assert(!PbFileChunk.verify(obj));
      return PbFileChunk.create(obj);
    });
    const config = {
      ended: true,
      chunks,
    };
    console.log(config)
    const fileChunk = await this.upload(config);
    assert(!PbFileChunk.verify(fileChunk));
    console.log("indexFile fileChunk", fileChunk);
    return PbFileChunk.create(fileChunk);
  }

  async CreateFromFileChunk(indexFileChunk) {
    const indexFile = await this.download(indexFileChunk);
    console.log("IndexFile", indexFile);
    const tasks = indexFile.chunks.map(chunk => async () => {
      return await this.sink.Download(chunk.url, chunk.size);
    });
    const downloadTasker = new Tasker(tasks, 50);
    await downloadTasker.done;
    console.log(downloadTasker.results);

    const hash = crypto.createHash("md5");
    hash.update(Buffer.concat(downloadTasker.results));
    console.log(hash.digest("hex"));
  }
}

class BootloaderFile extends BaseFile {
  constructor(sink) {
    super(sink);
    this.pbClass = PbBootloaderFile;
  }

  // addPadding() {
  //   const buf = this.pbClass.encode(this.pbClass.create(this.configObj)).finish();
  //   assert(buf.byteLength <= BOOTLOADER_APPROXIMATELY_SIZE);
  //   const paddingLength = BOOTLOADER_APPROXIMATELY_SIZE - buf.byteLength;
  //   this.configObj.padding = crypto.randomBytes(paddingLength);
  // }

  async GenDescription(fileSize, chunkSize, fileName, indexFile, aesKey, aesIV) {
    const blFileconfig = {
      fileSize,
      chunkSize,
      fileName,
      indexFile,
      aesKey,
      aesIV,
    };
    const bootloaderFile = await this.upload(blFileconfig, { noEncryption: true });
    const blDescConfig = {
      bootloaderFile,
    }
    console.log("bootloaderDesc config", blDescConfig)
    const descBuf = this.encodePb(PbBootloaderDescription, blDescConfig);
    return descBuf.toString('hex');
  }

  async CreateFromFileChunk(blFileChunk) {
    const blFile = await this.download(blFileChunk, { noEncryption: true });
    console.log("BootloaderFile config", blFile);
    this.sink.key = blFile.aesKey;
    this.sink.iv = blFile.aesIV;
    const indexFile = new IndexFile(this.sink);
    await indexFile.CreateFromFileChunk(blFile.indexFile);
  }
}

export class File {
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
    this.usedBits = new UsedBits(1, 5);
    this.sink = new BilibiliSink(this.usedBits, this.aesKey, this.aesIV);

    this.uploadConcurrency = 10;
    this.downloadConcurrency = 50;
  }

  async GenerateDescription() {
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
        const url = await this.sink.Upload(chunk, { validate: true });
        console.log(`Upload chunk ${i}, chunk length: ${chunk.byteLength}, result:`, url)
        return {
          size: chunk.byteLength,
          url,
          usedBits: this.usedBits.toString(),
        };
      }
      tasks.push(fn);
    }
    const uploadTasker = new Tasker(tasks, 10);
    await uploadTasker.done;

    const indexFile = new IndexFile(this.sink);
    const indexFileChunk = await indexFile.GenFileChunk(uploadTasker.results);
    const bootloaderFile = new BootloaderFile(this.sink)
    const descHex = await bootloaderFile.GenDescription(
      this.fileSize,
      this.chunkSize,
      this.fileName,
      indexFileChunk,
      this.aesKey,
      this.aesIV,
    );
    console.log(descHex)
    return descHex;
  }
}

export class DownloadFile {
  constructor(descHex) {
    const buf = Buffer.from(descHex, "hex");
    const desc = PbBootloaderDescription.decode(buf);
    this.desc = desc;
    this.sink = new BilibiliSink(
      new UsedBits(desc.bootloaderFile.usedBits),
    );
  }

  async test() {
    const blFile = new BootloaderFile(this.sink);
    await blFile.CreateFromFileChunk(this.desc.bootloaderFile)
  }
}
