import { EncoderType, JpegEncoder } from "../../src/jpeg-encoder/";
import { DecoderType, JpegDecoder } from "../../src/jpeg-decoder/";
import { UsedBits } from '../../src/bits-manipulation';
import { randomBytesArray, BufferToArrayBuffer } from "../../src/utils";
import _ from "lodash";
import path from "path";

const MASK_PHOTO_FILE_PATH = path.join(__dirname, "../../image_templates/mask_400px.jpg");

async function EncDecLoop(
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

test("test different usedBits value", async () => {
  async function test(usedBits: UsedBits) {
    EncDecLoop(EncoderType.jpegjsEncoder, DecoderType.jpegjsDecoder, usedBits, 10);
  }

  await Promise.all(_.flattenDeep(_.range(1, 6).map((i) => {
    return _.range(i, 6).map((j) => {
      return new UsedBits(i, j);
    })
  })).map((usedBits) => test(usedBits)));
});

test("different encoders & decoders should be compatible", async () => {
  const usedBits = UsedBits.fromNumber(4);

  const encoders = [
    EncoderType.jpegjsEncoder,
    EncoderType.wasmEncoder,
  ];
  const decoders = [
    DecoderType.jpegjsDecoder,
    DecoderType.wasmDecoder,
  ]
  await Promise.all(_.flattenDeep(encoders.map((encType) => {
    return decoders.map((decType) => {
      return EncDecLoop(encType, decType, usedBits);
    });
  })));
});

test("encoder should work with different payload sizes", async () => {
  const usedBits = UsedBits.fromNumber(4);
  const payloadSizes = [0, 1, 10, 100, 1000, 1024 * 10, 1024 * 100, 1024 * 1024];
  await Promise.all(payloadSizes.map((n) => {
    return EncDecLoop(EncoderType.wasmEncoder, DecoderType.wasmDecoder, usedBits, n);
  }));
});

test("photo mask demands usedBits's from to be greater than 1", async () => {
  await expect(async () => {
    await EncDecLoop(EncoderType.wasmEncoder, DecoderType.wasmDecoder, new UsedBits(1, 4), 1024, (enc) => {
      enc.setMaskPhotoFilePath(MASK_PHOTO_FILE_PATH);
    });
  }).rejects.toThrow(/.*should be greater than 1.*/);
})

test("encoder maskPhotoFilePath should work", async () => {
  const usedBits = new UsedBits(2, 4);
  await EncDecLoop(EncoderType.wasmEncoder, DecoderType.wasmDecoder, usedBits, 1024, (enc) => {
    enc.setMaskPhotoFilePath(MASK_PHOTO_FILE_PATH);
  });
});
