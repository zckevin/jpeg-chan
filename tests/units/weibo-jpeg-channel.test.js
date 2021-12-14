import WeiboJpegEncoder from "../../src/weibo-jpeg-encoder/";
import WeiboJpegDecoder from "../../src/weibo-jpeg-decoder/";

import randomBytes from "random-bytes";
import * as fs from "fs"
import { time } from "console";

test("jpeg encode/decode loop should works", async () => {
  // const n = 5;
  // const payload = new Uint8Array([1, 2, 3, 4, 5]);

  const n = 1024 * 10;
  const usedBitsN = 4;
  const randomBuf = await randomBytes(n);
  const payload = new Uint8Array(randomBuf);

  const enc = new WeiboJpegEncoder(usedBitsN);
  const dec = new WeiboJpegDecoder(usedBitsN);

  console.time("encode");
  const encoded = await enc.Write(payload.buffer);
  console.timeEnd("encode");
 
  console.time("decode");
  const decoded = await dec.Read(encoded, n);
  console.timeEnd("decode");
  expect(new Uint8Array(decoded)).toEqual(payload);
});
