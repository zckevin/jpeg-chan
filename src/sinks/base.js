import fs from "fs"
import fetch from 'node-fetch';
import crypto from "crypto";
import { JpegEncoder } from "../jpeg-encoder/index.js";
import { JpegDecoder } from "../jpeg-decoder/index.js";
import jpegjs from "../jpeg-js/index.js";
import { assert } from "../assert.js";

const AES_GCM_AUTH_TAG_LENGTH = 16;

export class BasicSink {
  constructor(usedBits, key, iv) {
    console.log("UsedBits: ", usedBits);
    this.usedBits = usedBits;

    this.MIN_UPLOAD_BUFFER_SIZE = 0;

    this.key = key;
    this.iv = iv;
    // if (key && iv) {
    //   this.cipher = crypto.createCipheriv("aes-128-gcm", key, iv);
    //   this.decipher = crypto.createDecipheriv("aes-128-gcm", key, iv);
    // }
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

  encryptBuffer(buf) {
    if (!this.key || !this.iv) {
      return buf;
    }
    const cipher = crypto.createCipheriv("aes-128-gcm", this.key, this.iv);
    const chunks = [];
    chunks.push(cipher.update(buf));
    chunks.push(cipher.final());
    chunks.push(cipher.getAuthTag());
    return Buffer.concat(chunks);
  }

  decryptBuffer(buf) {
    if (!this.key || !this.iv) {
      return buf;
    }
    assert(buf.length >= 16);
    const decipher = crypto.createDecipheriv("aes-128-gcm", this.key, this.iv);
    const chunks = [];
    decipher.setAuthTag(buf.subarray(buf.length - AES_GCM_AUTH_TAG_LENGTH));
    chunks.push(decipher.update(buf.subarray(0, buf.length - AES_GCM_AUTH_TAG_LENGTH)));
    chunks.push(decipher.final());
    return Buffer.concat(chunks);
  }


  /**
   * @param {Buffer} original data to upload 
   * @param {Object} options
   * @returns {string}
   */
  async Upload(original, options = {}) {
    const enc = new JpegEncoder(this.usedBits, JpegEncoder.jpegjsEncoder);
    if (options["photoMaskFile"]) {
      this.usePhotoAsMask(enc, options["photoMaskFile"]);
    }
    const encypted = options.noEncryption ?
      original :
      this.encryptBuffer(original);
    const encoded = await enc.Write(this.padBuffer(encypted));
    const url = await this.doUpload(encoded, options);
    if (options.validate) {
      const err = await this.validate(original, url, options);
      if (err) {
        throw err;
      }
    }
    return url;
  }

  /**
   * @param {String} url 
   * @param {Number} size 
   * @param {Object} options
   * @returns Buffer
   */
  async Download(url, size, options = {}) {
    const ab = await fetch(url).then(res => res.arrayBuffer());
    const dec = new JpegDecoder(this.usedBits, JpegDecoder.wasmDecoder);
    if (options.noEncryption) {
      return Buffer.from(await dec.Read(ab, size));
    } else {
      return this.decryptBuffer(Buffer.from(await dec.Read(ab, size + AES_GCM_AUTH_TAG_LENGTH)));
    }
  }

  async validate(original, url, options) {
    const decoded = await this.Download(url, original.byteLength, options);
    for (let i = 0; i < original.byteLength; i++) {
      if (original[i] !== decoded[i]) {
        console.log("mismatch", original, url, decoded)
        return new Error(`Mismatch at index ${i}: ${original[i]} : ${decoded[i]}`);
      }
    }
    return null;
  }
}