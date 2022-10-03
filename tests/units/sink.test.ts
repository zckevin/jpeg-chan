import { MemFileSink } from "../../src/sinks/memfile";
import { randomBytesArray } from "../../src/utils";
import { UsedBits } from "../../src/bits-manipulation";
import { SinkUploadConfig } from "../../src/config";
import { NewCipherConfigFromPassword } from "../../src/encryption"
import { EncoderType } from "../../src/jpeg-encoder";

const usedBits = new UsedBits(1, 4);
const cipherConfig = NewCipherConfigFromPassword(new Uint8Array(randomBytesArray(32)));
const uploadConfig = new SinkUploadConfig(usedBits, cipherConfig, 4, false, "", EncoderType.wasmEncoder, null);

async function uploadDownloadLoop() {
  const sink = new MemFileSink();
  const buf = Buffer.from(randomBytesArray(1024).buffer);
  const url = await sink.UploadBuffer(buf, uploadConfig);
  const decoded = await sink.DownloadDecodeDecrypt(url, buf.length, uploadConfig.toDownloadConfig());
  expect(decoded).toEqual(buf);
}

test("tmpfile upload/download loop", async () => {
  await uploadDownloadLoop();
});