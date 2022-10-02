import { UsedBits } from "../../src/bits-manipulation";
import { SinkDownloadConfig, SinkUploadConfig } from "../../src/config";
import { DecoderType } from "../../src/jpeg-decoder";
import { WorkerPool } from "../../src/workers";
import { randomBytesArray } from "../../src/utils";
import { EncryptBuffer, NewCipherConfigFromPassword } from "../../src/encryption"
import { EncodeBuffer } from '../../src/jpeg-encoder';
import { EncoderType } from "../../src/jpeg-encoder";

const usedBits = new UsedBits(1, 4);
const cipherConfig = NewCipherConfigFromPassword(new Uint8Array(randomBytesArray(32)));
const downloadConfig = new SinkDownloadConfig(usedBits, cipherConfig, 4, DecoderType.wasmDecoder, null);
const uploadConfig = new SinkUploadConfig(usedBits, cipherConfig, 4, false, "", EncoderType.wasmEncoder, null);

async function doDecodeDecrypt(ab: ArrayBuffer, read_n: number, dryRun: boolean) {
  const pool = new WorkerPool();
  const result = await pool.DecodeDecrypt(ab, read_n, usedBits, downloadConfig, dryRun);
  await pool.destroy();
  return result;
}

test("params echo test", async () => {
  const ab = randomBytesArray(1024).buffer;
  const result = await doDecodeDecrypt(ab, 1024, true) as any;
  expect(result.ab).toEqual(ab);
  expect(result.usedBits).toEqual(usedBits);
  // some internal fields loss there class type
  // expect(result.config).toEqual(downloadConfig);
})

test("do DecodeDecrypt", async () => {
  const ab = randomBytesArray(1024).buffer;
  const encypted = EncryptBuffer(Buffer.from(ab), uploadConfig.cipherConfig, 0);
  const encoded = await EncodeBuffer(
    encypted,
    uploadConfig.usedBits,
    uploadConfig,
  );
  const buf = await doDecodeDecrypt(encoded as ArrayBuffer, 1024, false);
  expect(buf).toEqual(new Uint8Array(ab));
})