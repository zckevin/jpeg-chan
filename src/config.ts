import { assert } from "./assert";
import { UsedBits } from "./bits-manipulation";
import { EncoderType } from "./jpeg-encoder/index";
import { DecoderType } from "./jpeg-decoder/index";
import { SinkType } from "./sinks/base";
import { AbortSignal } from "fetch-h2";

export class CipherConfig {
  constructor(
    public algorithm: string,
    public key: Buffer,
    public iv: Buffer,
  ) {
    assert(this.algorithm === "aes-128-gcm");
  }
}

class ConfigBase {
  constructor(
    public usedBits: UsedBits | null,
    public cipherConfig: CipherConfig,
    public concurrency: number,
  ) {
    assert(this.concurrency > 0, `Concurrency should be integer above 0 instead of ${this.concurrency}`);
  }
}

export class SinkUploadConfig extends ConfigBase {
  constructor(
    usedBits: UsedBits | null,
    cipherConfig: CipherConfig,
    concurrency: number,
    public validate: boolean,
    public maskPhotoFilePath: string,
    public encoderType: EncoderType,
    public sinkType: SinkType,
  ) {
    super(usedBits, cipherConfig, concurrency);
  }

  toDownloadConfig(): SinkDownloadConfig {
    return new SinkDownloadConfig(
      this.usedBits,
      this.cipherConfig,
      this.concurrency,
      DecoderType.wasmDecoder,
      null,
    );
  }

  cloneWithUsedBits(usedBits: UsedBits) {
    return new SinkUploadConfig(
      usedBits,
      this.cipherConfig,
      this.concurrency,
      this.validate,
      this.maskPhotoFilePath,
      this.encoderType,
      this.sinkType,
    )
  }
}

export class SinkDownloadConfig extends ConfigBase {
  constructor(
    usedBits: UsedBits | null,
    cipherConfig: CipherConfig,
    concurrency: number,
    public decoderType: DecoderType,
    public signal: AbortSignal,
  ) {
    super(usedBits, cipherConfig, concurrency);
  }

  cloneWithUsedBits(usedBits: UsedBits) {
    return new SinkDownloadConfig(usedBits, this.cipherConfig, this.concurrency, this.decoderType, this.signal);
  }

  cloneWithSignal(signal: AbortSignal) {
    return new SinkDownloadConfig(this.usedBits, this.cipherConfig, this.concurrency, this.decoderType, signal);
  }
}