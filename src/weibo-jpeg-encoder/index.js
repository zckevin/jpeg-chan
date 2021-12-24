import * as fs from "fs"

import { assert } from "../assert.js";
import { WeiboJpegChannel } from "../weibo-jpeg-channel.js";
import * as bits from "../bits-manipulation.js";
import jpegjs from "../jpeg-js/index.js";

export default class WeiboJpegEncoder extends WeiboJpegChannel {
  constructor(usedBitsN) {
    super(usedBitsN);
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
    // TODO: use other 2 bytes
    arr.forEach(nextByte => {
      targetImageData[counter++] = nextByte;
      targetImageData[counter++] = nextByte;
      targetImageData[counter++] = nextByte;
      targetImageData[counter++] = 255;
    });

    return {
      width: width,
      height: width,
      data: targetImageData
    }
  }

  /**
   * @param {ArrayBuffer} ab, input image raw data
   * @returns {Promise<ArrayBuffer>}
   */
  async Write(ab) {
    assert(ab.byteLength > 0, "input image data should not be empty");
    const serialized = bits.serialize(
      new Uint8Array(ab),
      this.unusedBitsN,
      this.mask
    );
    const targetImageData = this.generateTargetImageData(ab, serialized);
    const imageQuality = 100; // highest quality
    const targetImage = jpegjs.encode(targetImageData, imageQuality);
    return targetImage.data;
  }
}
