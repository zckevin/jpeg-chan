import * as bits from "../bits-manipulation.js";
import { JpegChannel } from "../jpeg-channel.js";
import * as browserDecoder from "./browser-decoder.js";
import { isBrowser } from "browser-or-node";

// import lazily/on-demand using webpack
async function importDecoderByEnv(decoderType) {
  switch (decoderType) {
    case JpegDecoder.browserDecoder:
      // return await import(/* webpackPrefetch: true */"./browser-decoder.js");
      return browserDecoder;
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
   * @param {Symbol} decoderType 
   */
  constructor(usedBits, decoderType) {
    super(usedBits);

    if (decoderType) {
      this.decoderType = decoderType;
    } else {
      this.decoderType = isBrowser ? 
        JpegDecoder.browserDecoder : JpegDecoder.jpegjsDecoder;
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
    return bits.deserialize(chromaComponent, this.usedBits, n).buffer;
  }
}

// TODO: remove this export
export const UsedBits = bits.UsedBits;