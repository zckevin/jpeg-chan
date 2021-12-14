import WeiboJpegEncoder from "../../src/weibo-jpeg-encoder/";
import WeiboJpegDecoder from "../../src/weibo-jpeg-decoder/";

import * as fs from "fs"

test("jpeg encode/decode loop should works", async () => {
  const n = 5;
  const payload = new Uint8Array([1, 2, 3, 4, 5]);

  const usedBitsN = 4;
  const width = 8;

  const enc = new WeiboJpegEncoder(usedBitsN, width);
  const dec = new WeiboJpegDecoder(usedBitsN, width);

  const encoded = await enc.Write(payload.buffer);
  const decoded = await dec.Read(encoded, n);
  expect(new Uint8Array(decoded)).toEqual(payload);
});
