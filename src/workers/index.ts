import { SinkDownloadConfig, SinkUploadConfig } from "../config";
import { EncryptEncodeParams, DecodeDecryptParams, WorkerParams, WorkerCmd } from "./params"
import { DecoderType, EncoderType } from "../common-types";
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
    log("resolve jpeg-worker.js from: ", filePath);
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
    filename: resolveFile("./dist", "jpeg-worker.js"),
    idleTimeout: this.poolIdleTimeout,
  })

  async DecodeDecrypt(
    ab: ArrayBuffer,
    read_n: number,
    config: SinkDownloadConfig,
  ): Promise<Buffer> {
    const params: DecodeDecryptParams = {
      // wasmDecoder uses memeory from wasm which is not transferable
      ab: ab.slice(0),
      decoderType: config.decoderType || DecoderType.wasmDecoder,
      cipherConfig: config.cipherConfig,
      usedBits: config.usedBits,
      read_n,
    }
    return await this.pool.run({ cmd: WorkerCmd.DecodeDecrypt, params } as WorkerParams);
  }

  async EncryptEncode(
    ab: ArrayBuffer,
    minUploadBufferSize: number,
    config: SinkUploadConfig,
  ) {
    const params: EncryptEncodeParams = {
      ab,
      minUploadBufferSize,
      encoderType: config.encoderType || EncoderType.wasmEncoder,
      usedBits: config.usedBits,
      cipherConfig: config.cipherConfig,
      maskPhotoFilePath: config.maskPhotoFilePath,
    }
    return await this.pool.run({ cmd: WorkerCmd.EncryptEncode, params } as WorkerParams);
  }

  async destroy() {
    await this.pool.destroy();
  }
}

export const workerPool = new WorkerPool();