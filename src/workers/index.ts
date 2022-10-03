import { SinkDownloadConfig } from "../config";
import { UsedBits } from '../bits-manipulation';
import { DecodeDecryptParams } from "./params"
import { DecoderType } from "../common-types";
import fs from "node:fs"
import path from 'node:path';
import Tinypool from '@zckevin/tinypool-cjs'
import debug from 'debug';

const log = debug(`jpeg:worker:pool`);

function resolveFile(filePath: string, fileName: string) {
  const filePaths = [
    path.join("./", filePath, fileName),
    // for production builds, __dirname is the output /dist folder
    path.resolve(eval('__dirname'), fileName),
    path.resolve(__dirname, filePath, fileName),
  ];
  for (const filePath of filePaths) {
    log("resolve decode-decrypt-worker.js from: ", filePath);
    if (fs.existsSync(filePath)) {
      log("found at:", filePath);
      return filePath;
    }
  }
  throw new Error(`Cannot resolve file: ${fileName}`);
}

export class WorkerPool {
  private poolIdleTimeout = 10_000;
  private pool = new Tinypool({
    filename: resolveFile("./dist", "decode-decrypt-worker.js"),
    idleTimeout: this.poolIdleTimeout,
  })

  async DecodeDecrypt(
    ab: ArrayBuffer,
    read_n: number,
    usedBits: UsedBits,
    config: SinkDownloadConfig,
    dryRun: boolean = false,
  ): Promise<Buffer> {
    const params: DecodeDecryptParams = {
      // wasmDecoder uses memeory from wasm which is not transferable
      ab: ab.slice(0),
      decoderType: config.decoderType || DecoderType.wasmDecoder,
      cipherConfig: config.cipherConfig,
      read_n, usedBits, dryRun,
    }
    return await this.pool.run(params);
  }

  async destroy() {
    await this.pool.destroy();
  }
}