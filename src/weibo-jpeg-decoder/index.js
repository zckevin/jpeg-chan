import * as bits from "../bits-manipulation.js";
import * as utils from "../utils.js";
import { WeiboJpegChannel } from "../weibo-jpeg-channel.js";

import { isBrowser } from "browser-or-node";

// import lazily/on-demand using webpack
async function importDecoderByEnv(decoderType) {
  switch (decoderType) {
    case WeiboJpegDecoder.browserDecoder:
      return await import(/* webpackPrefetch: true */"./browser-decoder.js");
    case WeiboJpegDecoder.jpegjsDecoder:
      return await import("./jpegjs-decoder.js");
    case WeiboJpegDecoder.wasmDecoder:
      return await import("./wasm-decoder.js");
    default:
      throw new Error(`Unknown decoder: ${decoderType}`);
  }
}

export default class WeiboJpegDecoder extends WeiboJpegChannel {
  static browserDecoder = Symbol("browserDecoder");
  static jpegjsDecoder = Symbol("jpegjsDecoder");
  static wasmDecoder = Symbol("wasmDecoder");

  /**
   * @param {Number} usedBitsN 
   * @param {Symbol} decoderType 
   */
  constructor(usedBitsN, decoderType) {
    super(usedBitsN);

    if (decoderType) {
      this.decoderType = decoderType;
    } else {
      this.decoderType = isBrowser ? 
        WeiboJpegDecoder.browserDecoder : WeiboJpegDecoder.jpegjsDecoder;
    }
    console.log("User decoder:", this.decoderType);
  }

  /**
   * @param {ArrayBuffer} ab input image raw data
   * @param {Number} n read n valid bytes from the jpeg file
   * @returns {Promise<ArrayBuffer>}
   */
  async Read(ab, n) {
    const decoder = await importDecoderByEnv(this.decoderType);
    const chromaComponent = await decoder.getJpegChromaComponent(ab);
    return bits.deserialize(chromaComponent, this.usedBitsN, n).buffer;
  }
}
