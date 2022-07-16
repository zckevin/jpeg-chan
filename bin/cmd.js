import { Command } from 'commander';
import crypto from 'crypto';
import fs from "fs";
import { fs as memfs } from 'memfs';

import { UsedBits } from "../src/bits-manipulation.js";
import { assert } from "../src/assert.js";
import { DownloadFile, UploadFile } from "../src/file.js"
import { SinkType_BILIBILI_BFS_ALBUM, pbFactory, SinkType_WEIBO_WX_SINAIMG } from "../src/protobuf/pb.js";
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
  .option('-c, --concurrency <concurrency>', 'upload concurrency', "10")
  .option('--no-validate', 'do not do validation')
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
    const f = new UploadFile(
      filePath,
      parseChunkSize(chunkSize),
      parseInt(options.concurrency),
      options.validate !== false,
      memfs,
      sinkType
    );
    const descHex = await f.GenerateDescription()
    console.log(descHex);
  });

program
  .command('upload')
  .argument('<filePath>', 'upload file', String)
  .argument('<chunkSize>', 'chunk size, e.g. 1024 / 42K / 2M', String)
  .option('-s, --sinkType <sinkType>', 'use only this kind of sink')
  .option('-c, --concurrency <concurrency>', 'upload concurrency', "10")
  .option('--no-validate', 'do not do validation')
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
    console.log(options.validate)
    const f = new UploadFile(
      filePath,
      parseChunkSize(chunkSize),
      parseInt(options.concurrency),
      options.validate !== false,
      fs,
      sinkType
    );
    const descHex = await f.GenerateDescription()
    console.log(descHex);
  });

program
  .command('download')
  .argument('<desc>', 'desc hex string', String)
  .option('-o, --output <outputFilePath>', 'the download file path')
  .option('-c, --concurrency <concurrency>', 'download concurrency', "50")
  .action(async (desc, options) => {
    await pbFactory.initPb();
    const f = new DownloadFile(desc, parseInt(options.concurrency));
    await f.Download(options.outputFilePath);
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
