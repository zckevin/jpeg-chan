import { assert } from "./assert";
import _ from "lodash";
import * as rx from "rxjs";

export interface cachedChunk {
  decoded: Buffer;
  index: number;
}

export interface readRequest {
  start: number;
  end: number;
}

export class ChunksCache {
  private cached: cachedChunk[] = [];
  private nextPopIndex = 0;

  private push(chunk: cachedChunk) {
    let insertIndex = this.cached.length;
    for (let i = 0; i < this.cached.length; i++) {
      if (chunk.index < this.cached[i].index) {
        insertIndex = i;
        break;
      }
    }
    this.cached.splice(insertIndex, 0, chunk);
    return chunk.index === this.nextPopIndex;
  }

  private pop() {
    let n = 0;
    for (let i = 0; i < this.cached.length; i++) {
      if (this.cached[i].index === this.nextPopIndex) {
        n++;
        this.nextPopIndex++;
      }
    }
    return this.cached.splice(0, n);
  }

  public onNewChunk(chunk: cachedChunk) {
    this.push(chunk);
    return (chunk.index === this.nextPopIndex) ? this.pop() : [];
  }
}

export class ChunksHelper {
  private cached: cachedChunk[] = [];
  private cachedRequestChunkIndexes = new Map<readRequest, number[]>();
  private requests: readRequest[];
  public targetReadChunkIndexes: number[] = [];

  constructor(
    public fileSize: number,
    public chunkSize: number,
    requests: readRequest[] = [],
  ) {
    assert(chunkSize > 0 && chunkSize <= fileSize, "invalid params");
    this.validateReadRequests(requests);
    const arr = requests.map((req) => {
      const chunkIndexes = this.caclulateReadChunkIndexes(req.start, req.end)
      this.cachedRequestChunkIndexes.set(req, chunkIndexes);
      return chunkIndexes;
    });
    this.targetReadChunkIndexes = _.uniq(_.flatten(arr));
    this.requests = [...requests];
  }

  validateReadRequests(requests: readRequest[]) {
    let lastEnd = 0;
    for (const req of requests) {
      assert(
        (req.start <= req.end) && (req.start >= lastEnd),
        "invalid request",
      );
      lastEnd = req.end;
    }
  }

  // range is [start, end) 
  caclulateReadChunkIndexes(start: number = 0, end: number = -1) {
    if (end === -1) {
      end = this.fileSize;
    }
    assert(
      start >= 0 &&
      start <= end &&
      end <= this.fileSize,
      "invalid params",
    );
    const startIndex = Math.floor(start / this.chunkSize);
    // end_chunk is exclusive
    const endIndex = Math.ceil(end / this.chunkSize);
    return _.range(startIndex, endIndex);
  }

  tryFullfillRequest(req: readRequest) {
    const chunkIndexes = this.cachedRequestChunkIndexes.get(req);
    if (!chunkIndexes) {
      return null;
    }
    const bufs: Buffer[] = [];
    for (const index of chunkIndexes) {
      const chunk = this.cached.find((c) => c.index === index);
      if (!chunk) {
        return null;
      }
      bufs.push(chunk.decoded);
    }
    return this.concatAndTrimBuffer(bufs, chunkIndexes, req.start, req.end);
  }

  onNewChunks(chunks: cachedChunk[]) {
    this.cached = this.cached.concat(chunks);
    const fullfilled: Buffer[] = [];
    for (const req of this.requests) {
      const buf = this.tryFullfillRequest(req);
      if (buf) {
        fullfilled.push(buf);
      } else {
        break;
      }
    }
    // console.log("onnewchunks", this.cached, fullfilled, this.cachedRequestChunkIndexes.get(this.requests[0]));
    this.requests.splice(0, fullfilled.length);
    return fullfilled;
  }

  concatAndTrimBuffer(bufs: Buffer[], chunkIndexes: number[], start: number, end: number): Buffer {
    if (bufs.length === 0) {
      return Buffer.alloc(0);
    }
    assert(bufs.length === chunkIndexes.length, "invalid params");
    const buf = Buffer.concat(bufs);
    const startOffset = start - chunkIndexes[0] * this.chunkSize;
    const endOffset = startOffset + (end - start);
    return buf.slice(startOffset, endOffset);
  }
}

export class BlockingQueue<T> {
  private queue: Array<T> = [];
  private notifier = new rx.Subject<boolean>();
  private comleted = false;
  private err: Error;

  constructor(public source$: rx.Observable<T>) {
    source$.subscribe({
      next: (v) => {
        this.queue.push(v);
        this.notifier.next(true);
      },
      error: (err) => {
        this.notifier.complete();
        this.comleted = true;
        this.err = err;
      },
      complete: () => {
        this.notifier.complete();
        this.comleted = true;
      },
    });
  }

  async blpop() {
    while (this.queue.length <= 0) {
      if (this.comleted) {
        if (this.err) {
          throw this.err;
        }
        return null;
      }
      await rx.lastValueFrom(this.notifier.pipe(
        rx.first(),
        rx.catchError(err => rx.of(true)),
      ));
    }
    const v = this.queue.shift();
    return v;
  }
}