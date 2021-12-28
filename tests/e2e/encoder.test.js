import { JpegEncoder } from "../../src/jpeg-encoder/index.js";
import { JpegDecoder } from "../../src/jpeg-decoder/index.js";
import { randomBytesArray } from "../../src/utils.js";

describe("Check JPEG encoders", () => {
  it("jpegjsEncoder & wasmEncoder should produce same result", async () => {
    const usedBitsN = 4;
    const n = 1024 * 1024;
    const payload = randomBytesArray(n);

    const jpegjsEnc = new JpegEncoder(usedBitsN, JpegEncoder.jpegjsEncoder);
    const wasmEnc = new JpegEncoder(usedBitsN, JpegEncoder.wasmEncoder);
  
    const jpegjsEncoded = await jpegjsEnc.Write(payload.buffer);
    const wasmEncoded = await wasmEnc.Write(payload.buffer);

    const dec = new JpegDecoder(usedBitsN, JpegDecoder.jpegjsDecoder);
    const jpegjsDecoded = await dec.Read(jpegjsEncoded, n);
    const wasmDecoded = await dec.Read(wasmEncoded, n);
    expect(jpegjsDecoded).toEqual(wasmDecoded);
  });
});