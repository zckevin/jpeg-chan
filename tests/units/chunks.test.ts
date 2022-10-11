import { ChunksHelper, ChunksCache, readRequest, BlockingQueue } from "../../src/chunks";
import { GeneratePermutation, GeneratePermutaionRanges } from "../../src/utils";
import _ from "lodash";
import * as rx from "rxjs";

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
});

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
});

test("ChunksHelper readRequests should be fullfilled", async () => {
  const fn = (fileSize: number, chunkSize: number) => {
    const buf = Buffer.from(_.range(0, fileSize));
    const chunks = _.range(0, Math.ceil(fileSize / chunkSize)).map(i => {
      return {
        index: i,
        decoded: buf.slice(i * chunkSize, (i + 1) * chunkSize)
      }
    });
    const requests_cases: Array<readRequest[]> =
      GeneratePermutaionRanges(0, fileSize).filter((arr) => arr.length > 0);
    requests_cases.map(requests => {
      const helper = new ChunksHelper(buf.length, chunkSize, requests);
      const arr = requests.map((req) => {
        const chunkIndexes = helper.caclulateReadChunkIndexes(req.start, req.end)
        return chunkIndexes;
      });
      const targetReadChunkIndexes = _.uniq(_.flatten(arr));
      const targetChunks = _.pullAt(_.clone(chunks), targetReadChunkIndexes);
      const fullfilled = helper.onNewChunks(targetChunks);
      // console.log(requests, fullfilled);
      expect(fullfilled).toEqual(requests.map(req => {
        return buf.slice(req.start, req.end);
      }));
    })
  };

  fn(5, 1);
});

test("ChunkHelper with empty requests", () => {
  const helper = new ChunksHelper(10, 1, [
    { start: 1, end: 1 },
    { start: 3, end: 3 },
  ]);
  expect(helper.targetReadChunkIndexes).toEqual([]);
  expect(helper.onNewChunks([])).toEqual([Buffer.from([]), Buffer.from([])]);
})

test("ChunksCache should work", async () => {
  const run = async (chunks: number[]) => {
    const cache = new ChunksCache();
    const source$ = rx.of(...chunks).pipe(
      rx.map((index: number) => {
        return {
          index,
          decoded: null,
        }
      }),
      rx.map((params) => rx.of(...cache.onNewChunk(params).map(chunk => chunk.index))),
      rx.mergeAll(),
      rx.toArray(),
    );
    return await rx.firstValueFrom(source$);
  }

  const n = 5;
  const cases = GeneratePermutation(_.range(n))
  for (const c of cases) {
    const results = await run(c);
    expect(results).toEqual(_.range(n));
  }
});

test("BlockingQueue run blpop one by one", async () => {
  const source$ = rx.interval(100).pipe(
    rx.take(3),
    rx.map((i) => i)
  );
  const q = new BlockingQueue(source$);
  for (let i = 0; i < 3; i++) {
    const v = await q.blpop();
    // slow consumer
    await new Promise((r) => setTimeout(() => r(null), 500));
    expect(v).toEqual(i);
  }
  expect(await q.blpop()).toEqual(null);
})

test("BlockingQueue run blpop concurrently", async () => {
  const source$ = rx.interval(100).pipe(
    rx.take(3),
    rx.map((i) => i)
  );
  const q = new BlockingQueue(source$);
  const promises = _.range(0, 3).map(() => {
    return q.blpop();
  });
  expect(await Promise.all(promises)).toEqual([0, 1, 2]);
  expect(await q.blpop()).toEqual(null);
})

test("zcsb BlockingQueue on error", async () => {
  const source$ = rx.interval(100).pipe(
    rx.take(3),
    rx.mergeMap((i) => {
      if (i === 1) {
        return rx.throwError(() => new Error("error"));
      }
      return rx.of(i);
    })
  );
  const q = new BlockingQueue(source$);

  const v = await q.blpop();
  await new Promise((r) => setTimeout(() => r(null), 500));
  expect(v).toEqual(0);

  expect(q.blpop()).rejects.toThrow(/error/);
  expect(q.blpop()).rejects.toThrow(/error/);
})