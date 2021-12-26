import * as fs from "fs"
import fetch from 'node-fetch';
import { Command } from 'commander';
import { randomBytesArray } from "../src/utils.js";
import { WeiboSink } from '../src/sinks/weibo.js';
import { BilibiliSink } from '../src/sinks/bilibili.js';
import WeiboJpegDecoder from "../src/weibo-jpeg-decoder/index.js";

const sinks = [ WeiboSink, BilibiliSink ];

async function validate(original, usedBitsN, url) {
  const ab = await fetch(url).then(res => res.arrayBuffer());
  console.log("inflation rate:", (ab.byteLength / original.byteLength).toFixed(2));

  const dec = new WeiboJpegDecoder(usedBitsN, WeiboJpegDecoder.jpegjsDecoder);
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

async function upload(buf, usedBitsN) {
  for (let i = 0; i < sinks.length; i++) {
    const sink = new sinks[i](usedBitsN);
    const urls = await sink.Upload(buf);
    for (let j = 0; j < urls.length; j++) {
      console.log(urls[j]);
      console.log(await validate(buf, sink.usedBitsN, urls[j]));
    }
  }
}

const program = new Command();
program
  .command('upload')
  .argument('<filePath>', 'upload file', String)
  .action(async (filePath, usedBitsN) => {
    console.log(filePath, usedBitsN)
    await upload(fs.readFileSync(filePath), usedBitsN);
  });

program
  .command('test')
  .argument('<size>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
  .argument('[usedBitsN]', 'number of bits to use', Number)
  .action(async (size, usedBitsN) => {
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
    console.log(`Test upload size: ${n}`);
    const arr = randomBytesArray(Number(n));
    await upload(Buffer.from(arr), usedBitsN);
  });

program
  .command('decode')
  .argument('<filePath>', 'decode file path', String)
  .argument('[usedBitsN]', 'number of bits to use', Number, 2)
  .action(async (filePath, usedBitsN) => {
    console.log(filePath, usedBitsN)
    // ...
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}