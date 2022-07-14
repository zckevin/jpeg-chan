import { Command } from 'commander';
import crypto from 'crypto';
import fs from "fs";
import { fs as memfs } from 'memfs';

import { UsedBits } from "../src/bits-manipulation.js";
import { assert } from "../src/assert.js";
import { DownloadFile, UploadFile } from "../src/file.js"
import { SinkType_BILIBILI_BFS_ALBUM, pbFactory, SinkType_WEIBO_WX_SINAIMG } from "../src/formats/pb.js";
import { sinkDelegate } from "../src/sinks/delegate.js";
import { CipherConfig, SinkUploadConfig } from "../src/config.js";

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
// const sinks = [WeiboSink];
// 
// async function validate(original, usedBits, url) {
//   const ab = await fetch(url).then(res => res.arrayBuffer());
//   console.log("inflation rate:", (ab.byteLength / original.byteLength).toFixed(2),
//     "image size:", ab.byteLength,
//     "payload size:", original.byteLength);
// 
//   const dec = new JpegDecoder(usedBits, JpegDecoder.wasmDecoder);
//   const decoded = Buffer.from(await dec.Read(ab, original.byteLength));
//   // console.log(original, decoded);
//   for (let i = 0; i < original.byteLength; i++) {
//     if (original[i] !== decoded[i]) {
//       console.log(`index ${i}`, original[i], decoded[i]);
//       return false;
//     }
//   }
//   return true;
// }
// 
// function tryUploadUntilFailed(bufLen, usedBits, options) {
//   const N = 10;
//   let i = 0;
//   const workerFunc = async function () {
//     while (true) {
//       console.log(`No. ${i++}:`);
//       const buf = Buffer.from(randomBytesArray(bufLen))
//       const sink = new sinks[0](usedBits);
//       options["validate"] = true;
//       const url = await sink.Upload(buf, options);
//       console.log(url);
//     }
//   }
//   for (let i = 0; i < N; i++) {
//     workerFunc();
//   }
// }

const program = new Command();

program
  .command('test')
  .argument('<size>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
  .argument('<usedBits>', 'which bits to use as data carrier, format: from-to, from >= 1, to <= 8', String)
  .option('-p, --maskPhotoFilePath <maskPhotoFilePath>', 'the photo path that is used as mask')
  .option('-s, --sinkType <sinkType>', 'use only this kind of sink')
  .action(async (size, usedBits, options) => {
    let sinkType = null;
    if (options.sinkType) {
      switch (options.sinkType) {
        case "bili": {
          sinkType = SinkType_BILIBILI_BFS_ALBUM;
          break;
        }
        case "wb": {
          sinkType = SinkType_WEIBO_WX_SINAIMG;
          break;
        }
        default: {
          throw new Error(`Unkown sink type: ${options.sinkType}`)
        }
      }
    }
    const uploadConfig = new SinkUploadConfig(
      new UsedBits(usedBits), // usedBits
      new CipherConfig("aes-128-gcm", crypto.randomBytes(16), crypto.randomBytes(12)),
      true, // validate
      options.maskPhotoFilePath, // maskPhotoFilePath
      null, // encoder
      sinkType, // sinkType
    );
    console.log(await sinkDelegate.Upload(crypto.randomBytes(parseChunkSize(size)), uploadConfig));
    });

program
  .command('uploadRandom')
  .argument('<size>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
  .argument('<chunkSize>', 'chunk size, e.g. 1024 / 42K / 2M', String)
  .option('-s, --sinkType <sinkType>', 'use only this kind of sink')
  .action(async (size, chunkSize, options) => {
    let sinkType = null;
    if (options.sinkType) {
      switch (options.sinkType) {
        case "bili": {
          sinkType = SinkType_BILIBILI_BFS_ALBUM;
          break;
        }
        case "wb": {
          sinkType = SinkType_WEIBO_WX_SINAIMG;
          break;
        }
        default: {
          throw new Error(`Unkown sink type: ${options.sinkType}`)
        }
      }
    }
    const filePath = "/1.file";
    memfs.writeFileSync(filePath, crypto.randomBytes(parseChunkSize(size)));

    await pbFactory.initPb();
    const f = new UploadFile(filePath, parseChunkSize(chunkSize), memfs, sinkType);
    const descHex = await f.GenerateDescription()
    console.log(descHex);
  });

// program
//   .command('try')
//   .argument('<size>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
//   .argument('<usedBits>', 'which bits to use as data carrier, format: from-to, from >= 1, to <= 8', String)
//   .option('-p, --photoMaskFile <photoMaskFile>', 'the photo path that is used as mask')
//   .action(async (size, usedBits, options) => {
//     // console.log(size, usedBits, options)
//     const args = usedBits.split("-");
//     assert(args.length === 2, `Invalid usedBits input: ${usedBits}`);
//     usedBits = new UsedBits(parseInt(args[0]), parseInt(args[1]));
//     tryUploadUntilFailed(parseChunkSize(size), usedBits, options);
//   });

program
  .command('upload')
  .argument('<filePath>', 'upload file', String)
  .argument('<chunkSize>', 'chunk size, e.g. 1024 / 42K / 2M', String)
  .option('-s, --sinkType <sinkType>', 'use only this kind of sink')
  .action(async (filePath, chunkSize, options) => {
    let sinkType = null;
    if (options.sinkType) {
      switch (options.sinkType) {
        case "bili": {
          sinkType = SinkType_BILIBILI_BFS_ALBUM;
          break;
        }
        case "wb": {
          sinkType = SinkType_WEIBO_WX_SINAIMG;
          break;
        }
        default: {
          throw new Error(`Unkown sink type: ${options.sinkType}`)
        }
      }
    }

    await pbFactory.initPb();
    const f = new UploadFile(filePath, parseChunkSize(chunkSize), fs, sinkType);
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
