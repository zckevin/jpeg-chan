import * as fs from "fs"

import { assert } from "../assert";
import { WeiboJpegChannel } from "../weibo_jpeg_channel.js";
import * as bits from "../bits_manipulation.js";
import jpegjs from "../jpeg-js/index.js";

export default class WeiboJpegEncoder extends WeiboJpegChannel {
  constructor(usedBitsN, width) {
    super(usedBitsN);
    this.width = width;
  }

  /**
   * @param {ArrayBuffer} ab, input image raw data
   * @returns {Promise<ArrayBuffer>}
   */
  async Write(ab) {
    assert(ab.byteLength > 0, "input image data should not be empty");
    const nextByteFn = bits.serializeTo(
      new Uint8Array(ab),
      this.unusedBitsN,
      this.mask
    );
    const targetImageByteLength = Math.ceil(
      (ab.byteLength * 8) / this.usedBitsN
    );
    const templateImageFilePath = "./image_templates/8.jpg";
    const imageBuf = fs.readFileSync(templateImageFilePath);
    const targetImageData = jpegjs.writeDataToRawImage(
      templateImageFilePath, imageBuf, nextByteFn
    );
    const imageQuality = 100;
    const targetImage = jpegjs.encode(targetImageData, imageQuality);

    const buf = targetImage.data;
    // Node.js Buffer to ArrayBuffer
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
}
