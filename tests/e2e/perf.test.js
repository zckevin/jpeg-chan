import { JpegEncoder } from "../../src/jpeg-encoder/index.js";
import { JpegDecoder } from "../../src/jpeg-decoder/index.js";
import { randomBytesArray } from "../../src/utils.js";

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
});