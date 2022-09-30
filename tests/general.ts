import { EncoderType, JpegEncoder } from "../src/jpeg-encoder/";
import { DecoderType, JpegDecoder } from "../src/jpeg-decoder/";
import { UsedBits } from '../src/bits-manipulation';
import { randomBytesArray } from "../src/utils";
import _ from "lodash";

export async function EncDecLoop(
  encType: EncoderType,
  decType: DecoderType,
  usedBits: UsedBits,
  n: number = 1024,
  handleEncoder: (enc: JpegEncoder) => void | null = null,
) {
  const payload = randomBytesArray(n);
  const enc = new JpegEncoder(usedBits, encType);
  const dec = new JpegDecoder(usedBits, decType);
  if (handleEncoder) {
    handleEncoder(enc);
  }
  const encoded = await enc.Write(payload.buffer);
  const decoded = await dec.Read(encoded as ArrayBuffer, n);
  expect(decoded).toEqual(payload.buffer);
}