import { JpegEncoder } from "../../src/jpeg-encoder/index";
import { DecoderType, JpegDecoder } from "../../src/jpeg-decoder/index";
import { randomBytesArray } from "../../src/utils";
import * as jpegjsDecoder from "../../src/jpeg-decoder/jpegjs-decoder";
import * as browserDecoder from "../../src/jpeg-decoder/browser-decoder";

import loadJpegForTesting from "./load-jpeg";
import { UsedBits } from "../../src/bits-manipulation";
const IMAGE_FILE = loadJpegForTesting();

describe("Check JPEG decoders", () => {
  it("browserDecoder & jpegjsDecoder should produce same result", async () => {
    const resp = await fetch(IMAGE_FILE.url);
    const imageAb = await resp.arrayBuffer();
    
    const jpegjsResult = await jpegjsDecoder.getJpegChromaComponent(imageAb);
    const browserResult = await browserDecoder.getJpegChromaComponent(imageAb);

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
  const usedBits = UsedBits.fromNumber(4);
  const payload = randomBytesArray(n);
  
  it("jpegjsEncoder & jpegjsDecoder", async () => {
    const enc = new JpegEncoder(usedBits);
    const encoded = await enc.Write(payload.buffer);

    const dec = new JpegDecoder(usedBits, DecoderType.jpegjsDecoder);
    const decoded = await dec.Read(encoded as ArrayBuffer, n);
    expect(new Uint8Array(decoded)).toEqual(payload);
  });

  it("jpegjsEncoder & browserDecoder", async () => {
    const enc = new JpegEncoder(usedBits);
    const encoded = await enc.Write(payload.buffer);

    const dec = new JpegDecoder(usedBits, DecoderType.browserDecoder);
    const decoded = await dec.Read(encoded as ArrayBuffer, n);
    expect(new Uint8Array(decoded)).toEqual(payload);
  });

  it("jpegjsEncoder & wasmDecoder", async () => {
    const enc = new JpegEncoder(usedBits);
    const encoded = await enc.Write(payload.buffer);

    const dec = new JpegDecoder(usedBits, DecoderType.wasmDecoder);
    const decoded = await dec.Read(encoded as ArrayBuffer, n);
    expect(new Uint8Array(decoded)).toEqual(payload);
  });
});