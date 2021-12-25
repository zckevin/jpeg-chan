import * as fs from "fs"
import fetch from 'node-fetch';
import { Command } from 'commander';
import { randomBytesArray } from "../src/utils.js";

import { Upload } from '../src/sinks/weibo.js';
import WeiboJpegEncoder from "../src/weibo-jpeg-encoder/index.js";
import WeiboJpegDecoder from "../src/weibo-jpeg-decoder/index.js";

async function validate(original, usedBitsN, url) {
  const buf = await fetch(url).then(res => res.buffer());
  console.log("inflation rate:", (buf.byteLength / original.byteLength).toFixed(2));

  const dec = new WeiboJpegDecoder(usedBitsN, WeiboJpegDecoder.jpegjsDecoder);
  const decoded = Buffer.from(await dec.Read(buf, original.byteLength));
  // console.log(original, decoded);
  for (let i = 0; i < original.byteLength; i++) {
    if (original[i] !== decoded[i]) {
      console.log(`index ${i}`, original[i], decoded[i])
      return false;
    }
  }
  return true;
}

async function upload(buf, usedBitsN, retries = 3) {
  const enc = new WeiboJpegEncoder(usedBitsN, WeiboJpegEncoder.jpegjsEncoder);
  const encoded = await enc.Write(buf);
  const urls = await Upload(encoded, false);

  console.log(urls);
  console.log(await validate(buf, usedBitsN, urls[0]));
}

const program = new Command();
program
  .command('upload')
  .argument('<filePath>', 'upload file', String)
  .argument('[usedBitsN]', 'number of bits to use', Number, 2)
  .action(async (filePath, usedBitsN) => {
    console.log(filePath, usedBitsN)
    await upload(fs.readFileSync(filePath), usedBitsN);
  });

program
  .command('test')
  .argument('<size>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
  .argument('[usedBitsN]', 'number of bits to use', Number, 2)
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