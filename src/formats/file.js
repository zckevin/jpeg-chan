import protobufjs from "protobufjs";
import { fileURLToPath } from 'url';
import path from 'path';
import fs from "fs";
import crypto from 'crypto';
import { assert } from "../assert.js";
import { BilibiliSink } from "../sinks/bilibili.js";
import { UsedBits } from "../bits-manipulation.js";

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

  async upload(pb, config = {}) {
    assert(this.pbClass);
    const buf = this.encodePb(this.pbClass, pb)
    const url = await this.sink.Upload(buf, { ...config, validate: true });
    return {
      size: buf.byteLength,
      url,
      usedBits: this.sink.usedBits.toString(),
    }
  }

  async download(fileChunk) {
    // assert(typeof fileChunk === PbFileChunk)
    assert(this.pbClass);
    const buf = await this.sink.Download(fileChunk.url, fileChunk.size)
    return this.pbClass.decode(buf);
  }
}

class IndexFile extends BaseFile {
  constructor(sink) {
    super(sink);
    this.pbClass = PbIndexFile;
  }

  async genFileChunk(fileChunkObjs) {
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

  async Create(indexFileChunk) {
    const indexFileConfig = await this.download(indexFileChunk);
    console.log("IndexFile config", indexFileConfig);
    // const chunkBuffers = indexFileConfig.chunks.map(chunk => {
    //   await this.download(indexFileChunk)
    // });
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

  async genDescription(fileSize, chunkSize, indexFile, aesKey, aesIV) {
    const blFileconfig = {
      fileSize,
      chunkSize,
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

  async Create(blFileChunk) {
    const blFileConfig = await this.download(blFileChunk);
    console.log("BootloaderFile config", blFileConfig);
  }

  async loadIndexFiles() {

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
    this.fd = fs.openSync(filePath, "r");

    this.n_chunks = Math.ceil(fileSize / chunkSize);
    this.lastChunkSize = fileSize % chunkSize;
    this.fileChunks = new Array(this.n_chunks);
    this.chunkIndex = 0;

    this.aesKey = crypto.randomBytes(16);
    this.aesIV = crypto.randomBytes(12);
    this.usedBits = new UsedBits(1, 5);
    this.sink = new BilibiliSink(this.usedBits, this.aesKey, this.aesIV);

    this.uploadConcurrency = 10;
    this.downloadConcurrency = 50;
  }

  async uploadWorker() {
    while (true) {
      if (this.chunkIndex >= this.n_chunks) {
        return;
      }
      // buffer index value and do self increment
      const index = this.chunkIndex++;
      let chunk = Buffer.alloc(this.chunkSize);
      const bytesRead = fs.readSync(this.fd, chunk, {
        length: this.chunkSize,
        position: this.chunkSize * index,
      });
      if (bytesRead < this.chunkSize) {
        chunk = chunk.slice(0, bytesRead);
      }
      const url = await this.sink.Upload(chunk, { validate: true });
      console.log(`Upload chunk ${index}, chunk length: ${chunk.byteLength}, result:`, url)
      this.fileChunks[index] = {
        size: chunk.byteLength,
        url,
        usedBits: this.usedBits.toString(),
      }
    }
  }

  async spawnWorkers(fn, concurrency) {
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(fn());
    }
    await Promise.all(promises)
  }

  async GenerateDescription() {
    await this.spawnWorkers(this.uploadWorker.bind(this), this.uploadConcurrency);

    const indexFile = new IndexFile(this.sink);
    const indexFileChunk = await indexFile.genFileChunk(this.fileChunks);
    const bootloaderFile = new BootloaderFile(this.sink)
    const descHex = await bootloaderFile.genDescription(
      this.fileSize,
      this.chunkSize,
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
    const buf = await this.sink.Download(
      this.desc.bootloaderFile.url,
      this.desc.bootloaderFile.size,
      { noEncryption: true }
    );
    const bootloaderFile = PbBootloaderFile.decode(buf);
    console.log(bootloaderFile)
  }

  async downloadWorker() {
    /*
    while (true) {
      if (currentIndex >= urls.length) {
        return;
      }
      // buffer index value and do self increment
      const index = currentIndex++;
      const ab = await fetch(urls[index]).then(res => res.arrayBuffer());
      console.log(urls[index], ab.byteLength)
      const dec = new JpegDecoder(defaultUsedBits, JpegDecoder.wasmDecoder);

      const bytesToRead = (index + 1 === urls.length) ? lastChunkSize : chunkSize;
      const decoded = Buffer.from(await dec.Read(ab, bytesToRead));
      chunks[index] = decoded;
    }
    */
  }
}
