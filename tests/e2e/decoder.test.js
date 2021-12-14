import * as jpegjsDecoder from "../../src/weibo-jpeg-decoder/jpegjs-decoder.js";
import * as browserDecoder from "../../src/weibo-jpeg-decoder/browser-decoder.js";

import loadJpegForTesting from "./load-jpeg.js";
const IMAGE_FILE = loadJpegForTesting();

describe("Check JPEG decoders", () => {
  it("browser and jpeg-js should produce same parsed output", async () => {
    const resp = await fetch(IMAGE_FILE.url);
    const imageAb = await resp.arrayBuffer();
    // expect(imageAb.byteLength === IMAGE_FILE.byteLength).toBeTruthy();
    
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
});