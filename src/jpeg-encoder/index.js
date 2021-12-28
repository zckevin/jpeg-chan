import { assert } from "../assert.js";
import { JpegChannel } from "../jpeg-channel.js";
import * as bits from "../bits-manipulation.js";

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

  setPhotoAsMaskFn(fn) {
    this.nextPhotoMaskByte = fn;
  }

  debugPrint(byte) {
    const s = "00000000" + byte.toString(2);
    console.log(s.substr(-8, 8));
  }

  generateTargetImageData(arr) {
    const width = this.cacluateSquareImageWidth(arr.byteLength);
    console.log("target image width: ", width);

    // I don't know why jpegjs can't work with 3 channels...
    const channels = this.encoderType === JpegEncoder.jpegjsEncoder ? 4 : 3;
    const targetImageData = new Uint8ClampedArray(width * width * channels);

    let counter = 0;
    // TODO: use other 2 components except chroma
    arr.forEach((nextByte, index) => {
      // Fill the setted mask image's chroma component byte's most significant bits 
      // to output image's most significant bits.
      if (this.nextPhotoMaskByte) {
        assert(this.usedBits.from >= 2,
          "When using photo mask, usedBits' from bit index should be greater than 1.")
        const photoMask = this.nextPhotoMaskByte(width);
        const usedMask = bits.keepMostSignificantNBits(photoMask, this.usedBits.from - 1);
        nextByte |= usedMask;
      }
      targetImageData[counter++] = nextByte; // r
      targetImageData[counter++] = nextByte; // g
      targetImageData[counter++] = nextByte; // b
      if (this.encoderType === JpegEncoder.jpegjsEncoder) {
        targetImageData[counter++] = 255;    // a
      }
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
    const serialized = bits.serialize(new Uint8Array(ab), this.usedBits);
    const targetImageData = this.generateTargetImageData(serialized);

    const encoder = await importEncoderByEnv(this.encoderType);
    const imageQuality = 100; // highest quality
    return await encoder.encodeImageData(targetImageData, imageQuality);
  }
}
