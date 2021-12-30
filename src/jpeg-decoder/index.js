import * as bits from "../bits-manipulation.js";
import { JpegChannel } from "../jpeg-channel.js";
// import * as browserDecoder from "./browser-decoder.js";
import { isBrowser } from "browser-or-node";
import { assert } from "../assert.js";

// import lazily/on-demand using webpack
async function importDecoderByEnv(decoderType) {
  switch (decoderType) {
    case JpegDecoder.browserDecoder:
      // return browserDecoder;
      return await import(/* webpackPrefetch: true */"./browser-decoder.js");
    case JpegDecoder.jpegjsDecoder:
      return await import("./jpegjs-decoder.js");
    case JpegDecoder.wasmDecoder:
      return await import("./wasm-decoder.js");
    default:
      throw new Error(`Unknown decoder: ${decoderType}`);
  }
}

export class JpegDecoder extends JpegChannel {
  static browserDecoder = Symbol("browserDecoder");
  static jpegjsDecoder = Symbol("jpegjsDecoder");
  static wasmDecoder = Symbol("wasmDecoder");

  /**
   * @param {Number} usedBits 
   * @param {Symbol|Object} decoder decoder type or decoder itself
   */
  constructor(usedBits, decoderOrType) {
    super(usedBits);

    if (!decoderOrType || typeof decoderOrType === "symbol") {
      if (decoderOrType) {
        this.decoderType = decoderOrType;
      } else {
        this.decoderType = isBrowser ? 
          JpegDecoder.browserDecoder : JpegDecoder.jpegjsDecoder;
      }
      console.log("User decoder:", this.decoderType);
    } else {
      assert("getJpegChromaComponent" in decoderOrType);
      this.decoder = decoderOrType;
    }
  }

  /**
   * @param {ArrayBuffer} ab input image raw data
   * @param {Number} n read n valid bytes from the jpeg file
   * @returns {Promise<ArrayBuffer>}
   */
  async Read(ab, n) {
    if (!this.decoder) {
      this.decoder = await importDecoderByEnv(this.decoderType);
    }
    const chromaComponent = await this.decoder.getJpegChromaComponent(ab);
    return bits.deserialize(chromaComponent, this.usedBits, n).buffer;
  }
}
