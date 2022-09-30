import { assert } from "./assert";
import { UsedBits } from "./bits-manipulation";
import { EncoderType } from "./jpeg-encoder/index";
import { DecoderType } from "./jpeg-decoder/index";
import { SinkType } from "./sinks/base";

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
      DecoderType.wasmDecoder
    );
  }
}

export class SinkDownloadConfig extends ConfigBase {
  constructor(
    usedBits: UsedBits | null,
    cipherConfig: CipherConfig,
    concurrency: number,
    public decoderType: DecoderType,
  ) {
    super(usedBits, cipherConfig, concurrency);
  }

  cloneWithNewUsedBits(usedBits: UsedBits) {
    return new SinkDownloadConfig(usedBits, this.cipherConfig, this.concurrency, this.decoderType);
  }
}