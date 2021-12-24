import * as jpegjsDecoder from "../../src/weibo-jpeg-decoder/jpegjs-decoder.js";
import * as browserDecoder from "../../src/weibo-jpeg-decoder/browser-decoder.js";
import WeiboJpegEncoder from "../../src/weibo-jpeg-encoder/index.js";
import WeiboJpegDecoder from "../../src/weibo-jpeg-decoder/index.js";
import { randomBytesArray } from "../../src/utils.js";

import loadJpegForTesting from "./load-jpeg.js";
const IMAGE_FILE = loadJpegForTesting();

describe("Check JPEG decoders", () => {
  it("browserDecoder & jpegjsDecoder", async () => {
    const resp = await fetch(IMAGE_FILE.url);
    const imageAb = await resp.arrayBuffer();
    
    const width = IMAGE_FILE.width;
    const height = IMAGE_FILE.height;
    const jpegjsResult = await jpegjsDecoder.getJpegChromaComponent(imageAb, width, height);
    const browserResult = await browserDecoder.getJpegChromaComponent(imageAb, width, height);

    expect(jpegjsResult.length).toEqual(browserResult.length);
    // can't be exact same for different decoders 
    for (let i = 0; i < jpegjsResult.length; i++) {
      const delta = Math.abs(jpegjsResult[i] - browserResult[i]);
      expect(delta).toBeLessThanOrEqual(1);
    }
  });

  it("jpegjsEncoder & browserDecoder", async () => {
    const n = 1024 * 1024;
    const usedBitsN = 4;
    const payload = randomBytesArray(n);

    const enc = new WeiboJpegEncoder(usedBitsN);
    const dec = new WeiboJpegDecoder(usedBitsN);

    const encoded = await enc.Write(payload.buffer);

    // const resp = await fetch(IMAGE_FILE.url);
    // const encoded = await resp.arrayBuffer();
 
    // performance.mark("all");
    const decoded = await dec.Read(encoded, n);
    // console.log("all", performance.measure("all", "all").duration);
    expect(new Uint8Array(decoded)).toEqual(payload);

    // console.log("decode", performance.getEntriesByName("browserDecoder:jpeg decode")[0].duration)
    // console.log("canvas", performance.getEntriesByName("browserDecoder:jpeg canvas")[0].duration)
  });
});