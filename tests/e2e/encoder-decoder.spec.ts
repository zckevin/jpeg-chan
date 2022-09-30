import { EncoderType } from "../../src/jpeg-encoder/index";
import { DecoderType } from "../../src/jpeg-decoder/index";
import * as jpegjsDecoder from "../../src/jpeg-decoder/jpegjs-decoder";
import * as browserDecoder from "../../src/jpeg-decoder/browser-decoder";
import { UsedBits } from "../../src/bits-manipulation";
import loadJpegForTesting from "./load-jpeg";
import { EncDecLoop } from "../general"
import _ from "lodash";

const IMAGE_FILE = loadJpegForTesting();

describe("Check JPEG decoders", () => {
  it("browserDecoder and jpegjsDecoder should produce same result", async () => {
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

it("different encoders & decoders should be compatible", async () => {
  const usedBits = UsedBits.fromNumber(4);

  const encoders = [
    EncoderType.jpegjsEncoder,
    EncoderType.wasmEncoder,
  ];
  const decoders = [
    DecoderType.browserDecoder,
    DecoderType.jpegjsDecoder,
    DecoderType.wasmDecoder,
  ]
  await Promise.all(_.flattenDeep(encoders.map((encType) => {
    return decoders.map((decType) => {
      return EncDecLoop(encType, decType, usedBits);
    });
  })));
});