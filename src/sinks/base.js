import WeiboJpegEncoder from "../weibo-jpeg-encoder/index.js";

export class BasicSink {
  constructor(usedBitsN) {
    console.log("UsedBitsN: ", usedBitsN);
    this.usedBitsN = usedBitsN;
  }

  /**
   * @param {Buffer} buf data to upload 
   * @param {Object} options
   * @returns {Array<string>}
   */
  async Upload(buf, options = {}) {
    const enc = new WeiboJpegEncoder(this.usedBitsN, WeiboJpegEncoder.jpegjsEncoder);
    const encoded = await enc.Write(buf);
    return await this.doUpload(encoded, options);
  }
}