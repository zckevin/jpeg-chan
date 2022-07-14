import * as fs from "fs"
import fetch from 'node-fetch';
import { Command } from 'commander';
import crypto from 'crypto';

import { randomBytesArray } from "../src/utils.js";
import { WeiboSink } from '../src/sinks/weibo.js';
import { BilibiliSink } from '../src/sinks/bilibili.js';
import { JpegDecoder } from "../src/jpeg-decoder/index.js";
import { UsedBits } from "../src/bits-manipulation.js";
import { assert } from "../src/assert.js";
import { DownloadFile, UploadFile } from "../src/file.js"
import { pbFactory } from "../src/formats/pb.js";

function parseChunkSize(size) {
  let n;
  if (size.match(/^(\d+)$/)) {
    n = parseInt(RegExp.$1);
  } else if (size.match(/^(\d+)[Kk]$/)) {
    n = parseInt(RegExp.$1) * 1024;
  } else if (size.match(/^(\d+)[Mm]$/)) {
    n = parseInt(RegExp.$1) * 1024 * 1024;
  } else {
    throw new Error(`invalid size ${size}`);
  }
  return n;
}

// const sinks = [ WeiboSink, BilibiliSink ];
const sinks = [BilibiliSink];

async function validate(original, usedBits, url) {
  const ab = await fetch(url).then(res => res.arrayBuffer());
  console.log("inflation rate:", (ab.byteLength / original.byteLength).toFixed(2),
    "image size:", ab.byteLength,
    "payload size:", original.byteLength);

  const dec = new JpegDecoder(usedBits, JpegDecoder.wasmDecoder);
  const decoded = Buffer.from(await dec.Read(ab, original.byteLength));
  // console.log(original, decoded);
  for (let i = 0; i < original.byteLength; i++) {
    if (original[i] !== decoded[i]) {
      console.log(`index ${i}`, original[i], decoded[i]);
      return false;
    }
  }
  return true;
}

async function upload(buf, usedBits, options) {
  const aesKey = crypto.randomBytes(16);
  const aesIV = crypto.randomBytes(12);
  for (let i = 0; i < sinks.length; i++) {
    const sink = new sinks[i](usedBits, aesKey, aesIV);
    console.time('img upload');
    options["validate"] = true;
    const url = await sink.Upload(buf, options);
    console.timeEnd('img upload');
    console.log(url);
  }
}

function tryUploadUntilFailed(bufLen, usedBits, options) {
  const N = 10;
  let i = 0;
  const workerFunc = async function () {
    while (true) {
      console.log(`No. ${i++}:`);
      const buf = Buffer.from(randomBytesArray(bufLen))
      const sink = new sinks[0](usedBits);
      options["validate"] = true;
      const url = await sink.Upload(buf, options);
      console.log(url);
    }
  }
  for (let i = 0; i < N; i++) {
    workerFunc();
  }
}

const program = new Command();

program
  .command('test')
  .argument('<size>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
  .argument('<usedBits>', 'which bits to use as data carrier, format: from-to, from >= 1, to <= 8', String)
  .option('-p, --photoMaskFile <photoMaskFile>', 'the photo path that is used as mask')
  .action(async (size, usedBits, options) => {
    // console.log(size, usedBits, options)

    let n;
    if (size.match(/^(\d+)$/)) {
      n = parseInt(RegExp.$1);
    } else if (size.match(/^(\d+)[Kk]$/)) {
      n = parseInt(RegExp.$1) * 1024;
    } else if (size.match(/^(\d+)[Mm]$/)) {
      n = parseInt(RegExp.$1) * 1024 * 1024;
    } else {
      throw new Error(`invalid size ${size}`);
    }

    const args = usedBits.split("-");
    assert(args.length === 2, `Invalid usedBits input: ${usedBits}`);
    usedBits = new UsedBits(parseInt(args[0]), parseInt(args[1]));

    const dataArr = randomBytesArray(Number(n));
    await upload(Buffer.from(dataArr), usedBits, options);
  });

program
  .command('try')
  .argument('<size>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
  .argument('<usedBits>', 'which bits to use as data carrier, format: from-to, from >= 1, to <= 8', String)
  .option('-p, --photoMaskFile <photoMaskFile>', 'the photo path that is used as mask')
  .action(async (size, usedBits, options) => {
    // console.log(size, usedBits, options)
    const args = usedBits.split("-");
    assert(args.length === 2, `Invalid usedBits input: ${usedBits}`);
    usedBits = new UsedBits(parseInt(args[0]), parseInt(args[1]));
    tryUploadUntilFailed(parseChunkSize(size), usedBits, options);
  });

program
  .command('upload')
  .argument('<filePath>', 'upload file', String)
  .argument('<chunkSize>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
  .action(async (filePath, chunkSize) => {
    await pbFactory.initPb();
    const f = new UploadFile(filePath, parseChunkSize(chunkSize));
    const descHex = await f.GenerateDescription()
    console.log(descHex);
  });

program
  .command('download')
  .argument('<desc>', 'desc hex string', String)
  .option('-o, --output <outputFilePath>', 'the download file path')
  .action(async (desc, options) => {
    await pbFactory.initPb();
    const f = new DownloadFile(desc)
    await f.Download(options.outputFilePath);
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
