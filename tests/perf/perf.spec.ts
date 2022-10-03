import { DecoderType } from '../../src/common-types';
import { JpegEncoder } from "../../src/jpeg-encoder/index";
import { JpegDecoder } from "../../src/jpeg-decoder/index";
import { randomBytesArray } from "../../src/utils";
import { UsedBits } from "../../src/bits-manipulation"

describe("perf decoders", () => {
  const results = [];

  async function Decode(data: ArrayBuffer, usedBits: UsedBits, n: number, decoderType: DecoderType) {
    performance.clearMarks();
    performance.clearMeasures();

    performance.mark("start");
    const dec = new JpegDecoder(usedBits, decoderType);
    await dec.Read(data, n);
    const { duration } = performance.measure("decode", "start");
    return duration;
  }

  async function perf(payloadSize: number, usedBits: UsedBits) {
    const payload = randomBytesArray(payloadSize);

    const enc = new JpegEncoder(usedBits);
    const encoded = await enc.Write(payload.buffer);

    const fn = Decode.bind(null, encoded, usedBits, payloadSize);

    const browserDuration = await fn(DecoderType.browserDecoder);
    const wasmDuration = await fn(DecoderType.wasmDecoder);

    const s = `Perf: payload size: ${payloadSize.toLocaleString()}, ` + 
      `${usedBits.from}-${usedBits.to}: ` +
      `${Math.floor(browserDuration)}ms,  ${Math.floor(wasmDuration)}ms`;
    results.push(s);
  }
  
  it("wasmDecoder & browserDecoder", async () => {
    const testImageWidth = [
      64,
      512,
      1024,
      10 * 1024,
      128 * 1024,
      512 * 1024,
      1024 * 1024,
      2 * 1024 * 1024,
      5 * 1024 * 1024,
      10 * 1024 * 1024,
    ];
    for (let i = 0; i < testImageWidth.length; i++) {
      const imageWidth = testImageWidth[i];
      for (let j = 2; j <= 6; j++) {
        const usedBits = new UsedBits(1, j);
        await perf(imageWidth, usedBits);
      }
    }
    console.log("                  browser   wasm");
    results.map(line => console.log(line));
  })
})