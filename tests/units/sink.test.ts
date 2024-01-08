import { MemFileSink } from "../../src/sinks/memfile";
import { BasicSink } from "../../src/sinks/base";
import { sinkDelegate } from "../../src/sinks";
import { randomBytesArray } from "../../src/utils";
import { UsedBits } from "../../src/bits-manipulation";
import { SinkUploadConfig } from "../../src/config";
import { NewCipherConfigFromPassword } from "../../src/encryption"
import { EncoderType, SinkType } from "../../src/common-types";

const usedBits = new UsedBits(1, 4);
const cipherConfig = NewCipherConfigFromPassword(new Uint8Array(randomBytesArray(32)));
const uploadConfig = new SinkUploadConfig(usedBits, cipherConfig, 4, false, "", EncoderType.wasmEncoder, SinkType.memfile, null, 0);

async function uploadDownloadLoop(sink: BasicSink) {
  const buf = Buffer.from(randomBytesArray(1024).buffer);
  const url = await sink.EncryptEncodeUpload(buf, uploadConfig);
  const decoded = await sink.DownloadDecodeDecrypt(url, buf.length, uploadConfig.toDownloadConfig());
  expect(decoded).toEqual(buf);
}

test("memfile upload/download loop", async () => {
  await uploadDownloadLoop(new MemFileSink());
});

test("chunk has incorrect checksum", async () => {
  const buf = Buffer.from(randomBytesArray(1024).buffer);
  const { filePtrs } = await sinkDelegate.UploadMultiple(() => buf, 1, uploadConfig, "test");
  const fp = filePtrs[0];

  const downloaded = await sinkDelegate.DownloadSingle(fp, uploadConfig.toDownloadConfig());
  expect(downloaded).toEqual(buf);

  const incorrectChecksumFp = fp;
  incorrectChecksumFp.checksum = Buffer.from("incorrect checksum");
  const promise = sinkDelegate.DownloadSingle(incorrectChecksumFp, uploadConfig.toDownloadConfig());
  await expect(promise).rejects.toThrow(/checksum mismatch/);
});
