import JpegEncoder from "../../src/jpeg-encoder/";
import JpegDecoder from "../../src/jpeg-decoder/";
import { UsedBits } from '../../src/bits-manipulation.js';
import { randomBytesArray } from "../../src/utils.js";

test("test different usedBits value", async () => {
  async function test(usedBits) {
    const n = 10;
    const payload = randomBytesArray(n);

    const enc = new JpegEncoder(usedBits, JpegEncoder.jpegjsEncoder);
    const dec = new JpegDecoder(usedBits, JpegDecoder.jpegjsDecoder);
  
    const encoded = await enc.Write(payload.buffer);
    const decoded = await dec.Read(encoded, n);
    expect(new Uint8Array(decoded)).toEqual(payload);
  }

  for (let i = 1; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      const usedBits = new UsedBits(i, j);
      await test(usedBits);
    }
  }
});

test("jpegjsEncoder & wasmEncoder should produce same result", async () => {
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
