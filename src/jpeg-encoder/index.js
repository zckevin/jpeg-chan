import sharp from "sharp";

import { assert } from "../assert.js";
import { JpegChannel } from "../jpeg-channel.js";
import * as bits from "../bits-manipulation.js";
import jpegjs from "../jpeg-js/index.js";

// import lazily/on-demand using webpack
async function importEncoderByEnv(typ) {
  switch (typ) {
    case JpegEncoder.jpegjsEncoder:
      return await import(/* webpackPrefetch: true */"./jpegjs-encoder.js");
    case JpegEncoder.wasmEncoder:
      return await import("./wasm-encoder.js");
    default:
      throw new Error(`Unknown encoder: ${typ}`);
  }
}

export class JpegEncoder extends JpegChannel {
  static jpegjsEncoder = Symbol("jpegjsEncoder");
  static wasmEncoder = Symbol("wasmEncoder");

  constructor(usedBits, encoderType = JpegEncoder.jpegjsEncoder) {
    super(usedBits);
    this.encoderType = encoderType;
    this.n_channels = 1;
    console.log("Use encoder:", this.encoderType);

    this.cachedMaskPhotoComponents = new Map();
  }

  /**
   * @param {Number} byteLength 
   * @returns {Number}
   */
  cacluateSquareImageWidth(byteLength) {
    assert(byteLength > 0, "byteLength should be greater than 0");
    // Bilibili demands image width larger than 10.
    const min_width = 10;
    return Math.max(
      Math.ceil(Math.sqrt(Math.ceil(byteLength / this.n_channels))),
      min_width
    );
  }

  setMaskPhotoFilePath(maskPhotoFilePath) {
    this.maskPhotoFilePath = maskPhotoFilePath;
  }

  debugPrint(byte) {
    const s = "00000000" + byte.toString(2);
    console.log(s.substr(-8, 8));
  }

  generateTargetImageData(width, arr, nextPhotoMaskByteFn = null) {
    // I don't know why jpegjs can't work with 3 channels...
    const channels = this.encoderType === JpegEncoder.jpegjsEncoder ? 4 : 3;
    const targetImageData = new Uint8ClampedArray(width * width * channels);

    let counter = 0;
    // TODO: use other 2 components except chroma
    arr.forEach((nextByte, index) => {
      // Fill the setted mask image's chroma component byte's most significant bits 
      // to output image's most significant bits.
      if (nextPhotoMaskByteFn) {
        assert(this.usedBits.from >= 2,
          "When using photo mask, usedBits' from bit index should be greater than 1.")
        const photoMask = nextPhotoMaskByteFn(width);
        const usedMask = bits.keepMostSignificantNBits(photoMask, this.usedBits.from - 1);
        nextByte |= usedMask;
      }
      targetImageData[counter++] = nextByte; // r
      if (this.n_channels === 1) {
        targetImageData[counter++] = nextByte; // g
        targetImageData[counter++] = nextByte; // b
        if (this.encoderType === JpegEncoder.jpegjsEncoder) {
          targetImageData[counter++] = 255;    // a
        }
      } else if (this.n_channels === 3) {
        if (((counter + 1) % 4 === 0) && this.encoderType === JpegEncoder.jpegjsEncoder) {
          targetImageData[counter++] = 255;    // a
        }
      }
    });

    return {
      width: width,
      height: width,
      data: targetImageData
    }
  }

  async getCachedMaskPhotoComponents(maskPhotoFilePath, width) {
    const key = `${maskPhotoFilePath}-${width}`;
    if (this.cachedMaskPhotoComponents.has(key)) {
      return this.cachedMaskPhotoComponents.get(key);
    }

    const maskPhotoBuf = await sharp(maskPhotoFilePath)
      .resize(width, width)
      .jpeg({ mozjpeg: true })
      .toBuffer();
    // .toFile('/tmp/hehe.mask.jpg', (err, info) => { console.log(err, info) });

    const { components } = jpegjs.getImageComponents(maskPhotoBuf.buffer);
    // mask photo's height & width should be larger than outputWidth
    assert(components[0].lines.length >= width && components[0].lines[0].length >= width);

    this.cachedMaskPhotoComponents.set(key, components);
    return components;
  }

  async caculateMaskPhoto(maskPhotoFilePath, width) {
    if (!maskPhotoFilePath) {
      return;
    }
    const components = await this.getCachedMaskPhotoComponents(maskPhotoFilePath, width);

    let i = 0, j = 0;
    const maskFn = (outputWidth) => {
      if (j >= outputWidth) {
        i += 1;
        j = 0;
      }
      return components[0].lines[i][j++];
    };
    return maskFn;
  }

  /**
   * @param {ArrayBuffer} ab, input image raw data
   * @returns {ArrayBuffer}
   */
  async Write(ab) {
    assert(ab.byteLength > 0, "input image data should not be empty");
    const serialized = bits.serialize(new Uint8Array(ab), this.usedBits);
    const width = this.cacluateSquareImageWidth(serialized.byteLength);
    console.log("target image width: ", width);

    const nextPhotoMaskByteFn = await this.caculateMaskPhoto(this.maskPhotoFilePath, width);
    const targetImageData = this.generateTargetImageData(width, serialized, nextPhotoMaskByteFn);

    const encoder = await importEncoderByEnv(this.encoderType);
    const imageQuality = 100; // highest quality
    return await encoder.encodeImageData(targetImageData, imageQuality);
  }
}
