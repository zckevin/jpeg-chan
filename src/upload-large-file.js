import fs from "fs"
import path from "path"
import { Buffer } from 'node:buffer';
import fetch from 'node-fetch';
import { createHash } from 'node:crypto'
import { BilibiliSink } from "./sinks/bilibili.js";
import { UsedBits } from "./bits-manipulation.js"
import { JpegDecoder } from "./jpeg-decoder/index.js";

import { DownloadFile, File } from "./formats/file.js"

const defaultUsedBits = new UsedBits(1, 5);

function dumpIndexFile(filePath, urls) {
  const fileName = `${path.parse(filePath).base}.index-file.txt`;
  const indexFilePath = path.join("/tmp", fileName);
  fs.writeFileSync(indexFilePath, JSON.stringify(urls))
}

export async function loadFileFromIndex(filePath, indexFilePath, chunkSize) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const n_chunks = Math.ceil(fileSize / chunkSize);
  const lastChunkSize = fileSize - (n_chunks - 1) * chunkSize;

  const urls = JSON.parse(fs.readFileSync(indexFilePath, "utf-8"));
  const chunks = new Array(urls.length);
  const maxConcurrency = 50;
  let currentIndex = 0;
  const worker = async () => {
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
  }

  let promises = [];
  for (let i = 0; i < maxConcurrency; i++) {
    promises.push(worker());
  }
  await Promise.all(promises)

  const hash = createHash('md5');
  hash.update(Buffer.concat(chunks));
  console.log(hash.digest('hex'));
}

export async function uploadLargeFile(filePath, chunkSize) {
  const f = new File(filePath, chunkSize);
  const descHex = await f.GenerateDescription()

  const download = new DownloadFile(descHex)
  await download.test();
}