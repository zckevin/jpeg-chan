import * as bits from "../bits_manipulation.js";
import * as utils from "../utils.js";
import { WeiboJpegChannel } from "../weibo_jpeg_channel.js";

import { isBrowser, isNode} from "browser-or-node";

// import lazily/on-demand using webpack
async function selectDecoderByEnv() {
  let m;
  if (isBrowser) {
    m = await import(/* webpackPrefetch: true */"./browser-decoder.js");
  } else if (isNode) {
    m = await import("./jpegjs-decoder.js");
  } else {
    throw new Error("only support browser & node.js env");
  }
  return m.getJpegChromaComponent;
}

export default class WeiboJpegDecoder extends WeiboJpegChannel {
  constructor(usedBitsN) {
    super(usedBitsN);
  }

  /**
   * @param {ArrayBuffer} ab input image raw data
   * @param {Number} n read n valid bytes from the jpeg file
   * @returns {Promise<ArrayBuffer>}
   */
  async Read(ab, n) {
    const getJpegChromaComponent = await selectDecoderByEnv();
    const chromaComponent = await getJpegChromaComponent(ab);
    const iter = bits.parseFrom(chromaComponent, this.usedBitsN, n);
    return utils.drainNBytes(iter, n).buffer;
  }
}
