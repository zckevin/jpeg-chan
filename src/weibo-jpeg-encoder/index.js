import * as fs from "fs"

import { assert } from "../assert.js";
import { WeiboJpegChannel } from "../weibo-jpeg-channel.js";
import * as bits from "../bits-manipulation.js";

// import lazily/on-demand using webpack
async function importEncoderByEnv(typ) {
  switch (typ) {
    case WeiboJpegEncoder.jpegjsEncoder:
      return await import(/* webpackPrefetch: true */"./jpegjs-encoder.js");
    case WeiboJpegEncoder.wasmEncoder:
      return await import("./wasm-encoder.js");
    default:
      throw new Error(`Unknown encoder: ${typ}`);
  }
}

export default class WeiboJpegEncoder extends WeiboJpegChannel {
  static jpegjsEncoder = Symbol("jpegjsEncoder");
  static wasmEncoder = Symbol("wasmEncoder");

  constructor(usedBitsN, encoderType = WeiboJpegEncoder.jpegjsEncoder) {
    super(usedBitsN);
    this.encoderType = encoderType;
    console.log("User encoder:", this.encoderType);
  }

  /**
   * @param {Number} byteLength 
   * @returns {Number}
   */
  cacluateSquareImageWidth(byteLength) {
    assert(byteLength > 0, "byteLength should be greater than 0");
    return Math.ceil(Math.sqrt(byteLength));
  }

  generateTargetImageData(ab, arr) {
    const width = this.cacluateSquareImageWidth(
      Math.ceil((ab.byteLength * 8) / this.usedBitsN)
    );
    console.log("target image width: ", width);
    const channels = 4; // rgba
    const targetImageData = new Uint8ClampedArray(width * width * channels);

    let counter = 0;
    // TODO: use other 2 components except chroma
    arr.forEach(nextByte => {
      targetImageData[counter++] = nextByte; // r
      targetImageData[counter++] = nextByte; // g
      targetImageData[counter++] = nextByte; // b
      targetImageData[counter++] = 255;      // a
    });

    return {
      width: width,
      height: width,
      data: targetImageData
    }
  }

  /**
   * @param {ArrayBuffer} ab, input image raw data
   * @returns {ArrayBuffer}
   */
  async Write(ab) {
    assert(ab.byteLength > 0, "input image data should not be empty");
    const serialized = bits.serialize(
      new Uint8Array(ab),
      this.unusedBitsN,
      this.mask
    );
    const targetImageData = this.generateTargetImageData(ab, serialized);

    const encoder = await importEncoderByEnv(this.encoderType);
    const imageQuality = 100; // highest quality
    return encoder.encodeImageData(targetImageData, imageQuality);
  }
}
