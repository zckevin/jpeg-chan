import fs from "fs"
import fetch from 'node-fetch';
import crypto from "crypto";
import { JpegEncoder } from "../jpeg-encoder/index.js";
import { JpegDecoder } from "../jpeg-decoder/index.js";
import jpegjs from "../jpeg-js/index.js";
import { assert } from "../assert.js";
import { CipherConfig, SinkDownloadConfig, SinkUploadConfig } from "../config.js";

const AES_GCM_AUTH_TAG_LENGTH = 16;

export class BasicSink {
  constructor() {
    this.MIN_UPLOAD_BUFFER_SIZE = 0;

    this.cachedEncoders = new Map();
    this.cachedDecoders = new Map();
  }

  getEncoder(usedBits, encoderType) {
    let enc;
    const key = `${usedBits}-${encoderType.toString()}`;
    if (this.cachedEncoders.has(key)) {
      enc = this.cachedEncoders.get(key);
    } else {
      enc = new JpegEncoder(usedBits, encoderType);
      this.cachedEncoders.set(key, enc);
    }
    return enc;
  }

  getDecoder(usedBits, decoderType) {
    let dec;
    const key = `${usedBits}-${decoderType.toString()}`;
    if (this.cachedDecoders.has(key)) {
      dec = this.cachedDecoders.get(key);
    } else {
      dec = new JpegDecoder(usedBits, decoderType);
      this.cachedDecoders.set(key, dec);
    }
    return dec;
  }

  usePhotoAsMask(encoder, photoMaskFile) {
    const maskPhotoBuf = fs.readFileSync(photoMaskFile);
    const { width, height, components } = jpegjs.getImageComponents(maskPhotoBuf.buffer);

    // mask photo's height & width should be larger than outputWidth
    // assert(components[0].lines.length >= outputWidth);
    // assert(components[0].lines[0].length >= outputWidth);

    let i = 0, j = 0;
    const maskFn = (outputWidth) => {
      if (j >= outputWidth) {
        i += 1;
        j = 0;
      }
      return components[0].lines[i][j++];
    };
    encoder.setPhotoAsMaskFn(maskFn);
  }

  padBuffer(buf) {
    if (this.MIN_UPLOAD_BUFFER_SIZE === 0 || buf.length >= this.MIN_UPLOAD_BUFFER_SIZE) {
      return buf;
    }
    const result = Buffer.concat([
      buf, crypto.randomBytes(this.MIN_UPLOAD_BUFFER_SIZE - buf.length)
    ]);
    // console.log("padding", buf, result)
    return result;
  }

  /**
   * @param {Buffer} buf 
   * @param {CipherConfig} cipherConfig 
   * @returns Buffer
   */
  encryptBuffer(buf, cipherConfig) {
    const cipher = crypto.createCipheriv(cipherConfig.algorithm, cipherConfig.key, cipherConfig.iv);
    const chunks = [];
    chunks.push(cipher.update(buf));
    chunks.push(cipher.final());
    chunks.push(cipher.getAuthTag());
    return Buffer.concat(chunks);
  }

  /**
   * @param {Buffer} buf 
   * @param {CipherConfig} cipherConfig 
   * @returns Buffer
   */
  decryptBuffer(buf, cipherConfig) {
    // Supports AES-128-GCM only
    assert(buf.length >= AES_GCM_AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(cipherConfig.algorithm, cipherConfig.key, cipherConfig.iv);
    const chunks = [];
    decipher.setAuthTag(buf.subarray(buf.length - AES_GCM_AUTH_TAG_LENGTH));
    chunks.push(decipher.update(buf.subarray(0, buf.length - AES_GCM_AUTH_TAG_LENGTH)));
    chunks.push(decipher.final());
    return Buffer.concat(chunks);
  }

  /**
   * @param {Buffer} original data to upload 
   * @param {SinkUploadConfig} config
   * @returns {string}
   */
  async Upload(original, config) {
    const enc = this.getEncoder(
      config.usedBits || this.DEFAULT_USED_BITS,
      config.encoder || JpegEncoder.jpegjsEncoder,
    );
    if (config.maskPhotoFilePath) {
      this.usePhotoAsMask(enc, config.maskPhotoFilePath);
    }
    const encypted = this.encryptBuffer(original, config.cipherConfig);
    const encoded = await enc.Write(this.padBuffer(encypted));
    const url = await this.doUpload(encoded, config);
    if (config.validate) {
      const err = await this.validate(original, url, config);
      if (err) {
        throw err;
      }
    }
    return url;
  }

  /**
   * @param {String} url 
   * @param {Number} size 
   * @param {SinkDownloadConfig} config
   * @returns Buffer
   */
  async Download(url, size, config) {
    const ab = await fetch(url).then(res => res.arrayBuffer());
    const dec = this.getDecoder(
      config.usedBits || this.DEFAULT_USED_BITS,
      config.decoder || JpegDecoder.wasmDecoder
    );
    // if (options.noEncryption) {
    //   return Buffer.from(await dec.Read(ab, size));
    // } else {
    //   return this.decryptBuffer(Buffer.from(await dec.Read(ab, size + AES_GCM_AUTH_TAG_LENGTH)));
    // }
    return this.decryptBuffer(Buffer.from(await dec.Read(ab, size + AES_GCM_AUTH_TAG_LENGTH)), config.cipherConfig);
  }

  async validate(original, url, config) {
    const decoded = await this.Download(url, original.byteLength, config);
    for (let i = 0; i < original.byteLength; i++) {
      if (original[i] !== decoded[i]) {
        console.log("mismatch", original, url, decoded)
        return new Error(`Mismatch at index ${i}: ${original[i]} : ${decoded[i]}`);
      }
    }
    console.log(`Validate ${url} successfully.`)
    return null;
  }

  /**
   * @param {string} url 
   * @returns bool
   */
  match(url) {
    assert(this.regex);
    return this.regex.test(url);
  }

  /**
   * @param {string} url 
   * @returns string
   */
  getImageIDFromUrl(url) {
    assert(this.regex);
    const results = this.regex.exec(url);
    if (results.length < 2) {
      throw new Error(`ID not found in url: ${url}`);
    }
    return results[1];
  }
}