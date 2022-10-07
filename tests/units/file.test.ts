import { randomString } from "../../src/utils";
import { UploadFile, DownloadFile } from "../../src/file";
import { fs as memfs } from 'memfs';
import { SinkType } from "../../src/common-types";
import { readRequest } from "../../src/chunks";
import { GeneratePermutaionRanges } from "../../src/utils";
import _ from "lodash"
import * as rx from "rxjs";

test("Downloadfile Readv", async () => {
  const concurrency = 1;
  const fn = async (fileSize: number, chunkSize: number) => {
    const buf = Buffer.from(_.range(0, fileSize));
    const filePath = `/${randomString()}.file`;
    memfs.writeFileSync(filePath, buf);
    const uf = new UploadFile(
      filePath,
      chunkSize,
      concurrency,
      false,
      memfs,
      SinkType.memfile,
    );
    const desc = await uf.GenerateDescription();

    const requests_cases: Array<readRequest[]> =
      GeneratePermutaionRanges(0, fileSize).filter((arr) => arr.length > 0);
    requests_cases.map(async (requests) => {
      const downloadFile = await DownloadFile.Create(desc, concurrency);
      const results = await rx.firstValueFrom(downloadFile.Readv(requests).pipe(rx.toArray()));
      results.map((result, index) => {
        const request = requests[index];
        expect(result).toEqual(buf.slice(request.start, request.end));
      })
    })
  };
  // only one chunk
  await fn(1, 1);
  // fileSize % chunkSize == 0
  await fn(4, 2);
  // fileSize % chunkSize != 0
  await fn(5, 2);
}, 60_000);

test("Download with short desc", async () => {
  const fileSize = 10, chunkSize = 3;
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
    SinkType.memfile,
  );
  const desc = await uf.GenerateDescription(true);

  await expect(DownloadFile.Create(desc, concurrency)).rejects.toThrow(/no password found/);

  const myBufferSlice = async (start: number, end: number) => {
    const downloadFile = await DownloadFile.Create(desc, concurrency, uf.blPassword);
    return await downloadFile.Read(end - start, start);
  }
  expect(await myBufferSlice(1, 8)).toEqual(buf.slice(1, 8));
});
