import { randomBytesArray, randomString } from "../../src/utils";
import { UploadFile, DownloadFile } from "../../src/file";
import { fs as memfs } from 'memfs';
import { SinkType } from "../../src/sinks/base";

test("file upload/download loop", async () => {
  const concurrency = 1;
  const n_chunks = 10;
  const chunk_size = 1024;
  const buf = Buffer.from(randomBytesArray(n_chunks * chunk_size).buffer);
  const filePath = `/${randomString()}.file`;
  memfs.writeFileSync(filePath, buf);
  const uf = new UploadFile(
    filePath,
    chunk_size,
    concurrency,
    false,
    memfs,
    SinkType.tmpfile,
  );
  const desc = await uf.GenerateDescription();
  const df = new DownloadFile(desc, concurrency);
  expect(await df.Download()).toEqual(buf);
})