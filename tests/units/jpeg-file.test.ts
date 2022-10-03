const { DownloadFile } = require("../../packages/jpeg-file/dist/index.js")
import { randomString } from "../../src/utils";
import { UploadFile } from "../../src/file";
import { fs as memfs } from 'memfs';
import { SinkType } from "../../src/sinks/base";
import _ from "lodash"

test("Downloadfile from jpeg-file package should work", async () => {
  const fileSize = 10;
  const chunkSize = 3;
  const concurrency = 1;
  const buf = Buffer.from(_.range(0, fileSize));
  const filePath = `/${randomString()}.file`;
  memfs.writeFileSync(filePath, buf);
  const uf = new UploadFile(
    filePath,
    chunkSize,
    concurrency,
    false,
    memfs,
    SinkType.tmpfile,
  );
  const desc = await uf.GenerateDescription();

  const downloadFile = await DownloadFile.Create(desc, concurrency);
  const myBufferSlice = async (start: number, end: number) => {
    return await downloadFile.Read(end - start, start);
  }
  expect(await myBufferSlice(1, 8)).toEqual(buf.slice(1, 8));
}, 10_000);
