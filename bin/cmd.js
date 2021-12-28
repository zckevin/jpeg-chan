import * as fs from "fs"
import fetch from 'node-fetch';
import { Command } from 'commander';
import { randomBytesArray } from "../src/utils.js";
import { WeiboSink } from '../src/sinks/weibo.js';
import { BilibiliSink } from '../src/sinks/bilibili.js';
import { JpegDecoder } from "../src/jpeg-decoder/index.js";
import { UsedBits } from "../src/bits-manipulation.js";
import { assert } from "console";

const sinks = [ WeiboSink, BilibiliSink ];

async function validate(original, usedBits, url) {
  const ab = await fetch(url).then(res => res.arrayBuffer());
  console.log("inflation rate:", (ab.byteLength / original.byteLength).toFixed(2));

  const dec = new JpegDecoder(usedBits, JpegDecoder.jpegjsDecoder);
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
  for (let i = 0; i < sinks.length; i++) {
    const sink = new sinks[i](usedBits);
    const urls = await sink.Upload(buf, options);
    for (let j = 0; j < urls.length; j++) {
      console.log(urls[j]);
      console.log(await validate(buf, usedBits, urls[j]));
    }
  }
}

const program = new Command();
program
  .command('upload')
  .argument('<filePath>', 'upload file', String)
  .argument('<usedBits>', 'which bits to use as data carrier, format: from-to, from >= 1, to <= 8', String)
  .action(async (filePath, usedBits) => {
    console.log(filePath, usedBits)

    const args = usedBits.split("-");
    assert(args.length === 2, `Invalid usedBits input: ${usedBits}`);
    usedBits = new UsedBits(parseInt(args[0]), parseInt(args[1]));

    await upload(fs.readFileSync(filePath), usedBits, {});
  });

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

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}