import fetch from 'node-fetch';
import crypto from "crypto";
import { EncoderType, JpegEncoder, Encoder } from "../jpeg-encoder/index";
import { DecoderType, JpegDecoder, Decoder } from "../jpeg-decoder/index";
import { assert } from "../assert";
import { CipherConfig, SinkDownloadConfig, SinkUploadConfig } from "../config";
import { UsedBits } from '../bits-manipulation';
import { isNode } from "browser-or-node";

const AES_GCM_AUTH_TAG_LENGTH = 16;

export enum SinkType {
  unknown = 0,
  weibo,
  bilibili,
}

export class BasicSink {
  private cachedEncoders: Map<string, JpegEncoder> = new Map();
  private cachedDecoders: Map<string, JpegDecoder> = new Map();

  protected supportsHTTP2 = false;

  constructor(
    public MIN_UPLOAD_BUFFER_SIZE: number,
    public DEFAULT_USED_BITS: UsedBits,
    public regex: RegExp,
    public type: SinkType,
  ) { }

  getEncoder(usedBits: UsedBits, encoderType: EncoderType) {
    let enc: JpegEncoder;
    const key = `${usedBits}-${encoderType.toString()}`;
    if (this.cachedEncoders.has(key)) {
      enc = this.cachedEncoders.get(key)!;
    } else {
      enc = new JpegEncoder(usedBits, encoderType);
      this.cachedEncoders.set(key, enc);
    }
    return enc;
  }

  getDecoder(usedBits: UsedBits, decoderType: DecoderType) {
    let dec: JpegDecoder;
    const key = `${usedBits}-${decoderType.toString()}`;
    if (this.cachedDecoders.has(key)) {
      dec = this.cachedDecoders.get(key)!;
    } else {
      dec = new JpegDecoder(usedBits, decoderType);
      this.cachedDecoders.set(key, dec);
    }
    return dec;
  }

  padBuffer(buf: Buffer) {
    if (this.MIN_UPLOAD_BUFFER_SIZE === 0 || buf.length >= this.MIN_UPLOAD_BUFFER_SIZE) {
      return buf;
    }
    const result = Buffer.concat([
      buf, crypto.randomBytes(this.MIN_UPLOAD_BUFFER_SIZE - buf.length)
    ]);
    // console.log("padding", buf, result)
    return result;
  }

  encryptBuffer(buf: Buffer, cipherConfig: CipherConfig) {
    const cipher = crypto.createCipheriv(cipherConfig.algorithm, cipherConfig.key, cipherConfig.iv) as crypto.CipherGCM;
    const chunks: Buffer[] = [];
    chunks.push(cipher.update(buf));
    chunks.push(cipher.final());
    chunks.push(cipher.getAuthTag());
    return Buffer.concat(chunks);
  }

  decryptBuffer(buf: Buffer, cipherConfig: CipherConfig) {
    // Supports AES-128-GCM only
    assert(buf.length >= AES_GCM_AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(cipherConfig.algorithm, cipherConfig.key, cipherConfig.iv) as crypto.DecipherGCM;
    const chunks: Buffer[] = [];
    decipher.setAuthTag(buf.subarray(buf.length - AES_GCM_AUTH_TAG_LENGTH));
    chunks.push(decipher.update(buf.subarray(0, buf.length - AES_GCM_AUTH_TAG_LENGTH)));
    chunks.push(decipher.final());
    return Buffer.concat(chunks);
  }

  async Upload(original: Buffer, config: SinkUploadConfig) {
    const enc = this.getEncoder(
      config.usedBits || this.DEFAULT_USED_BITS,
      config.encoderType || EncoderType.jpegjsEncoder,
    );
    console.log("config", config)
    if (config.maskPhotoFilePath) {
      // this.usePhotoAsMask(enc, config.maskPhotoFilePath);
      enc.setMaskPhotoFilePath(config.maskPhotoFilePath);
    }
    const encypted = this.encryptBuffer(original, config.cipherConfig);
    const encoded = await enc.Write(this.padBuffer(encypted));
    const url = await this.DoUpload(encoded as ArrayBuffer, config);
    if (config.validate) {
      const err = await this.validate(original, url, config.toDownloadConfig());
      if (err) {
        throw err;
      }
    }
    return url;
  }

  async Download(url: string, config: SinkDownloadConfig) {
    // TODO: merge this
    if (isNode) {
      return await this.DoNodeDownload(url);
    } else {
      return await fetch(url).then(res => res.arrayBuffer());
    }
  }

  async DecodeDecrypt(ab: ArrayBuffer, size: number, config: SinkDownloadConfig) {
    const dec = this.getDecoder(
      config.usedBits || this.DEFAULT_USED_BITS,
      config.decoderType || DecoderType.wasmDecoder
    );
    // if (options.noEncryption) {
    //   return Buffer.from(await dec.Read(ab, size));
    // } else {
    //   return this.decryptBuffer(Buffer.from(await dec.Read(ab, size + AES_GCM_AUTH_TAG_LENGTH)));
    // }
    const decoded = await dec.Read(ab, size + AES_GCM_AUTH_TAG_LENGTH);
    return this.decryptBuffer(Buffer.from(decoded), config.cipherConfig);
  }

  async DownloadDecodeDecrypt(url: string, size: number, config: SinkDownloadConfig) {
    const ab = await this.Download(url, config);
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

  protected async DoNodeDownload(url: string): Promise<ArrayBuffer> {
    throw new Error("Not implemented");
  }

  public ExpandIDToUrl(id: string): string {
    throw new Error("Not implemented");
  }
}