#!/usr/bin/env node

const { Command } = require('commander');
const crypto = require('node:crypto');
const fs = require('node:fs');
const memfs = require('memfs').fs;
const { SinkType, UploadFile, DownloadFile } = require("../packages/jpeg-file/dist/index.js");

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

function parseSinkType(sinkType) {
  switch (sinkType) {
    case "bili": {
      return SinkType.bilibili;
    }
    case "wb": {
      return SinkType.weibo;
    }
    case "mem": {
      return SinkType.memfile;
    }
  }
  throw new Error(`Unknown sink type: ${options.sinkType}`)
}

const program = new Command();

program
  .command('test')
  .argument('<size>', 'test upload buffer size, e.g. 1024 / 42K / 2M', String)
  .argument('<chunkSize>', 'chunk size, e.g. 1024 / 42K / 2M', String)
  .option('-s, --sinkType <sinkType>', 'use only this kind of sink', "bili")
  .option('-c, --concurrency <concurrency>', 'concurrency', "1")
  .option('-i, --interval <sleep_interval>', 'interval', "200")
  .option('-m, --maskPhotoFilePath <maskPhotoFilePath>', 'maskPhotoFilePath', String)
  .option('-b, --usedBits <usedBits>', 'usedBits', String)
  .option('--no-validate', 'do not do validation')
  .action(async (size, chunkSize, options) => {
    const sinkType = parseSinkType(options.sinkType);
    const filePath = "/1.file";
    const buf = crypto.randomBytes(parseChunkSize(size));
    memfs.writeFileSync(filePath, buf);
    const f = new UploadFile(
      filePath,
      parseChunkSize(chunkSize),
      parseInt(options.concurrency),
      options.validate,
      memfs,
      sinkType,
      options.maskPhotoFilePath,
      options.usedBits,
      parseInt(options.interval),
    );
    console.log(await f.GenerateDescription());
  });

program
  .command('upload')
  .argument('<filePath>', 'upload file', String)
  .argument('<chunkSize>', 'chunk size, e.g. 1024 / 42K / 2M', String)
  .option('-s, --sinkType <sinkType>', 'use only this kind of sink', "bili")
  .option('-c, --concurrency <concurrency>', 'concurrency', "1")
  .option('-i, --interval <sleep_interval>', 'interval', "200")
  .option('-m, --maskPhotoFilePath <maskPhotoFilePath>', 'maskPhotoFilePath', String)
  .option('-b, --usedBits <usedBits>', 'usedBits', "")
  .action(async (filePath, chunkSize, options) => {
    const sinkType = parseSinkType(options.sinkType);
    const f = new UploadFile(
      filePath,
      parseChunkSize(chunkSize),
      parseInt(options.concurrency),
      false,
      fs,
      sinkType,
      options.maskPhotoFilePath,
      options.usedBits,
      parseInt(options.interval),
    );
    console.log(await f.GenerateDescription(true));
  });

program
  .command('download')
  .argument('<desc>', 'desc string', String)
  .option('-c, --concurrency <concurrency>', 'concurrency', "10")
  .action(async (desc, options) => {
    const f = await DownloadFile.Create(
      desc,
      parseInt(options.concurrency),
    );
    await f.SaveToFile();
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
