import { SinkDownloadConfig } from "../config";
import { UsedBits } from '../bits-manipulation';
import { DecodeDecryptParams } from "./params"
import path from 'path';
import Tinypool from 'tinypool'
import { DecoderType } from "../jpeg-decoder";

export class WorkerPool {
  private poolIdleTimeout = 10_000;
  private pool = new Tinypool({
    filename: path.resolve(__dirname, "./dist/worker.min.js"),
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