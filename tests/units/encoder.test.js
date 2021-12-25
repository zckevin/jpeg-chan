import WeiboJpegEncoder from "../../src/weibo-jpeg-encoder/";
import WeiboJpegDecoder from "../../src/weibo-jpeg-decoder/";
import { randomBytesArray } from "../../src/utils.js";

test("test different usedBitsN value", async () => {
  async function test(usedBitsN) {
    const n = 10;
    const payload = randomBytesArray(n);

    const enc = new WeiboJpegEncoder(usedBitsN, WeiboJpegEncoder.jpegjsEncoder);
    const dec = new WeiboJpegDecoder(usedBitsN, WeiboJpegDecoder.jpegjsDecoder);
  
    const encoded = await enc.Write(payload.buffer);
    const decoded = await dec.Read(encoded, n);
    expect(new Uint8Array(decoded)).toEqual(payload);
  }

  for (let n = 0; n < 10; n++) {
    for (let i = 1; i <= 6; i++) {
      await test(i);
    }
  }
});

test("jpegjsEncoder & wasmEncoder should produce same result", async () => {
  const usedBitsN = 4;
  const n = 1024 * 1024;
  const payload = randomBytesArray(n);

  const jpegjsEnc = new WeiboJpegEncoder(usedBitsN, WeiboJpegEncoder.jpegjsEncoder);
  const wasmEnc = new WeiboJpegEncoder(usedBitsN, WeiboJpegEncoder.wasmEncoder);
  
  const jpegjsEncoded = await jpegjsEnc.Write(payload.buffer);
  const wasmEncoded = await wasmEnc.Write(payload.buffer);

  const dec = new WeiboJpegDecoder(usedBitsN, WeiboJpegDecoder.jpegjsDecoder);
  const jpegjsDecoded = await dec.Read(jpegjsEncoded, n);
  const wasmDecoded = await dec.Read(wasmEncoded, n);
  expect(jpegjsDecoded).toEqual(wasmDecoded);
});
