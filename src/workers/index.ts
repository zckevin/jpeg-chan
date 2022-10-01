import Tinypool from 'tinypool'
import { SinkDownloadConfig } from "../config";
import { UsedBits } from '../bits-manipulation';
import path from 'path';

export class WorkerPool {
  private poolIdleTimeout = 10_000;
  private pool = new Tinypool({
    filename: path.resolve(__dirname, "./dist/worker.min.js"),
    idleTimeout: this.poolIdleTimeout,
  })

  constructor() { }

  async DecodeDecrypt(
    ab: ArrayBuffer,
    read_n: number,
    usedBits: UsedBits,
    config: SinkDownloadConfig,
    dryRun: boolean = false,
  ): Promise<Buffer> {
    // wasmDecoder uses memeory from wasm which is not transferable
    const abCopy = ab.slice(0);
    return await this.pool.run({
      ab: abCopy, read_n, usedBits, config, dryRun,
    })
  }

  async destroy() {
    await this.pool.destroy();
  }
}