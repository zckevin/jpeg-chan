import {randomString } from "../../src/utils";
import { UploadFile, DownloadFile, ChunksHelper } from "../../src/file";
import { fs as memfs } from 'memfs';
import { SinkType } from "../../src/sinks/base";
import _ from "lodash"

test("ChunksHelper caclulateReadChunkIndexes", async () => {
  expect(new ChunksHelper(2, 2).caclulateReadChunkIndexes()).toEqual([0]);
  expect(new ChunksHelper(2, 1).caclulateReadChunkIndexes()).toEqual([0, 1]);
  expect(new ChunksHelper(2, 1).caclulateReadChunkIndexes(1, 2)).toEqual([1]);
  expect(new ChunksHelper(2, 1).caclulateReadChunkIndexes(1, 1)).toEqual([]);

  const errorCases = [
    [0, 0],
    [0, 1],
    [1, 0],
    [2, 1, -1],
    [2, 3],
    [2, 1, 2, 1],
    [2, 1, 3],
  ]
  for (const c of errorCases) {
    const [a, b] = c.slice(0, 2);
    const suffix = c.slice(2);
    expect(() => ChunksHelper.prototype.caclulateReadChunkIndexes.apply(new ChunksHelper(a, b), suffix)).toThrow(/invalid params/);
  }
}, 30_000);

test("ChunksHelper concatAndTrimBuffer", async () => {
  const fn = (fileSize: number, chunkSize: number) => {
    const buf = Buffer.from(_.range(0, fileSize));
    const chunks = _.range(0, Math.ceil(fileSize / chunkSize))
      .map(i => buf.slice(i * chunkSize, (i + 1) * chunkSize));

    const helper = new ChunksHelper(buf.length, chunkSize);
    const myBufferSlice = (start: number, end: number) => {
      const chunkIndexes = helper.caclulateReadChunkIndexes(start, end);
      return helper.concatAndTrimBuffer(_.pullAt(_.clone(chunks), chunkIndexes), chunkIndexes, start, end);
    };

    for (let i = 0; i <= buf.length; i++) {
      for (let j = i; j <= buf.length; j++) {
        expect(myBufferSlice(i, j)).toEqual(buf.slice(i, j));
      }
    }
  };
  for (let i = 1; i <= 10; i++) {
    for (let j = 1; j <= i; j++) {
      fn(i, j);
    }
  }
}, 30_000);

// test("zcsb", async () => {
//   const downloadFile = await DownloadFile.Create("invalid desc", 1);
//   await downloadFile.Read(1, 1);
// });

test("Downloadfile Read with range", async () => {
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

    const downloadFile = await DownloadFile.Create(desc, concurrency);
    const myBufferSlice = async (start: number, end: number) => {
      return await downloadFile.Read(end - start, start);
    }
    for (let i = 0; i <= buf.length; i++) {
      for (let j = i; j <= buf.length; j++) {
        expect(await myBufferSlice(i, j)).toEqual(buf.slice(i, j));
      }
    }
  };
  // only one chunk
  await fn(1, 1);
  // fileSize % chunkSize == 0
  await fn(10, 2);
  // fileSize % chunkSize != 0
  await fn(10, 3);
}, 30_000);
