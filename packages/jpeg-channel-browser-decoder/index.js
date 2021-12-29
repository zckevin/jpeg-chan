// TODO: this class is duplicate with //src/jpeg-decoder/index.js,
// maybe we can merge them, and use tree-shaking to remove unused 
// dependencies?

// import { JpegChannel } from "../../src/jpeg-channel.js";
// import * as browserDecoder from "../../src/jpeg-decoder/browser-decoder.js";
// export class BrowserJpegDecoder extends JpegChannel {
//   constructor(usedBits) {
//     super(usedBits);
//   }
// 
//   /**
//    * @param {ArrayBuffer} ab input image raw data
//    * @param {Number} n read n valid bytes from the jpeg file
//    * @returns {Promise<ArrayBuffer>}
//    */
//   async Read(ab, n) {
//     const decoder = browserDecoder;
//     const chromaComponent = await decoder.getJpegChromaComponent(ab);
//     return bits.deserialize(chromaComponent, this.usedBits, n).buffer;
//   }
// }

export { JpegDecoder } from "../../src/jpeg-decoder/index.js";
export { UsedBits } from "../../src/bits-manipulation.js";
