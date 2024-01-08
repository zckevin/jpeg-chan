import fetch from 'node-fetch';
import { assert } from "../assert";
import { SinkDownloadConfig, SinkUploadConfig } from "../config";
import { UsedBits } from '../bits-manipulation';
import { isNode } from "browser-or-node";
import { EncryptBuffer, DecryptBuffer } from "../encryption"
import { EncodeBuffer } from '../jpeg-encoder';
import { DecodeBuffer } from '../jpeg-decoder';
import { SinkType, DecoderType, EncoderType } from '../common-types';

export class BasicSink {
  protected supportsHTTP2 = false;

  constructor(
    public MIN_UPLOAD_BUFFER_SIZE: number,
    public DEFAULT_USED_BITS: UsedBits,
    public regexes: RegExp[],
    public type: SinkType,
  ) { }

  // TODO: testonly, maybe remove?
  async EncryptEncodeUpload(original: Buffer, config: SinkUploadConfig) {
    const encypted = EncryptBuffer(original, config.cipherConfig, this.MIN_UPLOAD_BUFFER_SIZE);
    const encoded = await EncodeBuffer(
      encypted,
      config.usedBits || this.DEFAULT_USED_BITS,
      config.encoderType || EncoderType.wasmEncoder,
      config.maskPhotoFilePath,
    );
    const url = await this.DoUpload(encoded as ArrayBuffer, config);
    if (config.validate) {
      const err = await this.validate(original, url, config.toDownloadConfig());
      if (err) {
        throw err;
      }
    }
    return url;
  }

  async DownloadRawData(url: string, config: SinkDownloadConfig) {
    // TODO: merge this
    if (isNode) {
      return await this.DoNodeDownload(url, config);
    } else {
      return await fetch(url).then(res => res.arrayBuffer());
    }
  }

  async DecodeDecrypt(ab: ArrayBuffer, size: number, config: SinkDownloadConfig) {
    const decoded = await DecodeBuffer(
      ab,
      size,
      config.usedBits || this.DEFAULT_USED_BITS,
      config.decoderType || DecoderType.wasmDecoder,
    );
    return DecryptBuffer(Buffer.from(decoded), config.cipherConfig);
  }

  async DownloadDecodeDecrypt(url: string, size: number, config: SinkDownloadConfig) {
    const ab = await this.DownloadRawData(url, config);
    return await this.DecodeDecrypt(ab, size, config);
  }

  async validate(original: Buffer, url: string, config: SinkDownloadConfig) {
    const decoded = await this.DownloadDecodeDecrypt(url, original.byteLength, config);
    for (let i = 0; i < original.byteLength; i++) {
      if (original[i] !== decoded[i]) {
        console.log("mismatch", original, url, decoded)
        return new Error(`Mismatch at index ${i}: ${original[i]} : ${decoded[i]}`);
      }
    }
    console.log(`Validate ${url} successfully.`)
    return null;
  }

  match(url: string) {
    assert(this.regexes.length > 0);
    for (let i = 0; i < this.regexes.length; i++) {
      if (this.regexes[i].test(url)) {
        return true;
      }
    }
    return false;
  }

  getImageIDFromUrl(url: string) {
    assert(this.regexes.length > 0);
    for (let i = 0; i < this.regexes.length; i++) {
      const results = this.regexes[i].exec(url);
      if (results!.length < 2) {
        continue;
      }
      return results![1];
    }
    throw new Error(`ID not found in url: ${url}`);
  }

  public async DoUpload(ab: ArrayBuffer, config: SinkUploadConfig): Promise<string> {
    throw new Error("Not implemented");
  }

  protected async DoNodeDownload(url: string, config: SinkDownloadConfig): Promise<ArrayBuffer> {
    throw new Error("Not implemented");
  }

  public ExpandIDToUrl(id: string, sinkTypeMinor: number): string {
    throw new Error("Not implemented");
  }

  public MinorVersion(): number {
    // throw new Error("Not implemented");
    return 0;
  }
}