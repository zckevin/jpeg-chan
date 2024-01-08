import { assert } from "./assert";
import { UsedBits } from "./bits-manipulation";
import { EncoderType, DecoderType, SinkType } from './common-types';
import { AbortSignal } from "abort-controller";

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
    public signal: AbortSignal,
  ) {
    assert(this.concurrency > 0, `Concurrency should be integer above 0 instead of ${this.concurrency}`);
  }

  cloneWithSignal(signal: AbortSignal) {
    const cloned = this.clone() as (typeof this);
    cloned.signal = signal;
    return cloned;
  }

  cloneWithUsedBits(usedBits: UsedBits) {
    const cloned = this.clone() as (typeof this);
    cloned.usedBits = usedBits;
    return cloned;
  }

  clone(): any {
    throw new Error("Not implemented");
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
    signal: AbortSignal,
    public sleepInterval: number,
  ) {
    super(usedBits, cipherConfig, concurrency, signal);
  }

  clone() {
    return new SinkUploadConfig(
      this.usedBits,
      this.cipherConfig,
      this.concurrency,
      this.validate,
      this.maskPhotoFilePath,
      this.encoderType,
      this.sinkType,
      this.signal,
      this.sleepInterval,
    );
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
}

export class SinkDownloadConfig extends ConfigBase {
  constructor(
    usedBits: UsedBits | null,
    cipherConfig: CipherConfig,
    concurrency: number,
    public decoderType: DecoderType,
    signal: AbortSignal,
  ) {
    super(usedBits, cipherConfig, concurrency, signal);
  }

  clone() {
    return new SinkDownloadConfig(this.usedBits, this.cipherConfig, this.concurrency, this.decoderType, this.signal);
  }
}