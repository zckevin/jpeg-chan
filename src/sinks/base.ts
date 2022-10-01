import fetch from 'node-fetch';
import { assert } from "../assert";
import { SinkDownloadConfig, SinkUploadConfig } from "../config";
import { UsedBits } from '../bits-manipulation';
import { isNode } from "browser-or-node";
import { EncryptBuffer, DecryptBuffer } from "../encryption"
import { EncodeBuffer, DecodeBuffer } from '../encoder-decoder';

export enum SinkType {
  unknown = 0,
  weibo,
  bilibili,
}

export class BasicSink {
  protected supportsHTTP2 = false;

  constructor(
    public MIN_UPLOAD_BUFFER_SIZE: number,
    public DEFAULT_USED_BITS: UsedBits,
    public regex: RegExp,
    public type: SinkType,
  ) { }

  async UploadBuffer(original: Buffer, config: SinkUploadConfig) {
    const encypted = EncryptBuffer(original, config.cipherConfig, this.MIN_UPLOAD_BUFFER_SIZE);
    const encoded = await EncodeBuffer(
      encypted,
      config.usedBits || this.DEFAULT_USED_BITS,
      config,
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
      config,
    );
    return DecryptBuffer(Buffer.from(decoded), config.cipherConfig);
  }

  async DownloadDecodeDecrypt(url: string, size: number, config: SinkDownloadConfig) {
    const ab = await this.DownloadRawData(url, config);
    return await this.DecodeDecrypt(ab, size, config);
  }

  async validate(original: ArrayBuffer, url: string, config: SinkDownloadConfig) {
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
    assert(this.regex);
    return this.regex.test(url);
  }

  getImageIDFromUrl(url: string) {
    assert(this.regex);
    const results = this.regex.exec(url);
    if (results!.length < 2) {
      throw new Error(`ID not found in url: ${url}`);
    }
    return results![1];
  }

  protected async DoUpload(ab: ArrayBuffer, config: SinkUploadConfig): Promise<string> {
    throw new Error("Not implemented");
  }

  protected async DoNodeDownload(url: string, config: SinkDownloadConfig): Promise<ArrayBuffer> {
    throw new Error("Not implemented");
  }

  public ExpandIDToUrl(id: string): string {
    throw new Error("Not implemented");
  }
}