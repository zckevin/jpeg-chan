import fs from "fs"
import { JpegEncoder } from "../jpeg-encoder/index.js";
import jpegjs from "../jpeg-js/index.js";

export class BasicSink {
  constructor(usedBitsN) {
    console.log("UsedBitsN: ", usedBitsN);
    this.usedBitsN = usedBitsN;
  }

  usePhotoAsMask(encoder, photoMaskFile) {
    const maskPhotoBuf = fs.readFileSync(photoMaskFile);
    const {width, height, components} = jpegjs.getImageComponents(maskPhotoBuf.buffer);

    // mask photo's height & width should be larger than outputWidth
    // assert(components[0].lines.length >= outputWidth);
    // assert(components[0].lines[0].length >= outputWidth);

    let i = 0, j = 0;
    const maskFn = (outputWidth) => {
      if (j >= outputWidth) {
        i += 1;
        j = 0;
      }
      return components[0].lines[i][j++];
    };
    encoder.setPhotoAsMaskFn(maskFn);
  }

  /**
   * @param {Buffer} buf data to upload 
   * @param {Object} options
   * @returns {Array<string>}
   */
  async Upload(buf, options = {}) {
    const enc = new JpegEncoder(this.usedBitsN, JpegEncoder.jpegjsEncoder);
    if (options["photoMaskFile"]) {
      this.usePhotoAsMask(enc, options["photoMaskFile"]);
    }
    const encoded = await enc.Write(buf);
    return await this.doUpload(encoded, options);
  }
}