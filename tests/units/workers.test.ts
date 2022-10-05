import { UsedBits } from "../../src/bits-manipulation";
import { SinkDownloadConfig, SinkUploadConfig } from "../../src/config";
import { WorkerPool } from "../../src/workers";
import { randomBytesArray } from "../../src/utils";
import { NewCipherConfigFromPassword } from "../../src/encryption"
import { EncoderType, DecoderType } from "../../src/common-types";

const usedBits = new UsedBits(1, 4);
const cipherConfig = NewCipherConfigFromPassword(new Uint8Array(randomBytesArray(32)));
const downloadConfig = new SinkDownloadConfig(usedBits, cipherConfig, 4, DecoderType.wasmDecoder, null);
const uploadConfig = new SinkUploadConfig(usedBits, cipherConfig, 4, false, "", EncoderType.wasmEncoder, null, null);

async function doEncryptEncode(ab: ArrayBuffer) {
  const pool = new WorkerPool();
  const result = await pool.EncryptEncode(ab, 0, uploadConfig);
  await pool.destroy();
  return result;
}

async function doDecodeDecrypt(ab: ArrayBuffer, read_n: number) {
  const pool = new WorkerPool();
  const result = await pool.DecodeDecrypt(ab, read_n, downloadConfig);
  await pool.destroy();
  return result;
}

test("EncryptEncode & DecodeDecrypt with worker pool", async () => {
  const N = 1024;
  const original = randomBytesArray(N);
  const result = await doDecodeDecrypt(await doEncryptEncode(original), N);
  expect(result).toEqual(original);
});
