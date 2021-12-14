import WeiboJpegEncoder from "../../src/weibo-jpeg-encoder/";
import WeiboJpegDecoder from "../../src/weibo-jpeg-decoder/";
import { randomBytesArray } from "../../src/utils.js";

import * as fs from "fs"

test("jpeg encode/decode loop should works", async () => {
  // const n = 5;
  // const payload = new Uint8Array([1, 2, 3, 4, 5]);

  const n = 1024 * 100;
  const usedBitsN = 4;
  const payload = randomBytesArray(n);

  const enc = new WeiboJpegEncoder(usedBitsN);
  const dec = new WeiboJpegDecoder(usedBitsN);

  console.time("encode");
  const encoded = await enc.Write(payload.buffer);
  console.timeEnd("encode");

  // fs.writeFileSync("/tmp/test.jpg", Buffer.from(encoded));
 
  console.time("decode");
  const decoded = await dec.Read(encoded, n);
  console.timeEnd("decode");
  expect(new Uint8Array(decoded)).toEqual(payload);
});
