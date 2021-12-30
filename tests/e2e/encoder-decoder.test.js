import { JpegEncoder } from "../../src/jpeg-encoder/index.js";
import { JpegDecoder } from "../../src/jpeg-decoder/index.js";
import { randomBytesArray } from "../../src/utils.js";
import * as jpegjsDecoder from "../../src/jpeg-decoder/jpegjs-decoder.js";
import * as browserDecoder from "../../src/jpeg-decoder/browser-decoder.js";

import loadJpegForTesting from "./load-jpeg.js";
const IMAGE_FILE = loadJpegForTesting();

describe("Check JPEG decoders", () => {
  it("browserDecoder & jpegjsDecoder should produce same result", async () => {
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
});

describe("Check encoders & decoders loop", () => {
  const n = 1024 * 1024;
  const usedBitsN = 4;
  const payload = randomBytesArray(n);
  
  it("jpegjsEncoder & jpegjsDecoder", async () => {
    const enc = new JpegEncoder(usedBitsN);
    const encoded = await enc.Write(payload.buffer);

    const dec = new JpegDecoder(usedBitsN, JpegDecoder.jpegjsDecoder);
    const decoded = await dec.Read(encoded, n);
    expect(new Uint8Array(decoded)).toEqual(payload);
  });

  it("jpegjsEncoder & browserDecoder", async () => {
    const enc = new JpegEncoder(usedBitsN);
    const encoded = await enc.Write(payload.buffer);

    const dec = new JpegDecoder(usedBitsN, JpegDecoder.browserDecoder);
    const decoded = await dec.Read(encoded, n);
    expect(new Uint8Array(decoded)).toEqual(payload);
  });

  it("jpegjsEncoder & wasmDecoder", async () => {
    const enc = new JpegEncoder(usedBitsN);
    const encoded = await enc.Write(payload.buffer);

    const dec = new JpegDecoder(usedBitsN, JpegDecoder.wasmDecoder);
    const decoded = await dec.Read(encoded, n);
    expect(new Uint8Array(decoded)).toEqual(payload);
  });
});