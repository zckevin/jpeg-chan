import { EncoderType, JpegEncoder } from "../../src/jpeg-encoder/";
import { DecoderType, JpegDecoder } from "../../src/jpeg-decoder/";
import { UsedBits } from '../../src/bits-manipulation';
import { randomBytesArray } from "../../src/utils";

test("test different usedBits value", async () => {
  async function test(usedBits) {
    const n = 10;
    const payload = randomBytesArray(n);

    const enc = new JpegEncoder(usedBits, EncoderType.jpegjsEncoder);
    const dec = new JpegDecoder(usedBits, DecoderType.jpegjsDecoder);
  
    const encoded = await enc.Write(payload.buffer);
    const decoded = await dec.Read(encoded as ArrayBuffer, n);
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
  const usedBits = UsedBits.fromNumber(4);
  const n = 1024 * 1024;
  const payload = randomBytesArray(n);

  const jpegjsEnc = new JpegEncoder(usedBits, EncoderType.jpegjsEncoder);
  const wasmEnc = new JpegEncoder(usedBits, EncoderType.wasmEncoder);
  
  const jpegjsEncoded = await jpegjsEnc.Write(payload.buffer);
  const wasmEncoded = await wasmEnc.Write(payload.buffer);

  const dec = new JpegDecoder(usedBits, DecoderType.jpegjsDecoder);
  const jpegjsDecoded = await dec.Read(jpegjsEncoded as ArrayBuffer, n);
  const wasmDecoded = await dec.Read(wasmEncoded as ArrayBuffer, n);
  expect(jpegjsDecoded).toEqual(wasmDecoded);
});
