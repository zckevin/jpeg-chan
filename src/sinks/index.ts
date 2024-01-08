import { WeiboSink } from "./weibo";
import { BilibiliSink } from "./bilibili";
import { MemFileSink } from "./memfile";
import { TmpFileSink } from "./tmpfile";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { PbFilePointer, PbResourceURL, EncodeResourceID } from "../../protobuf";
import { BasicSink } from "./base";
import { SinkType } from "../common-types";
import _, { find, sample } from "lodash";
import { assert } from "../assert";
import { RxTask } from "../rxjs-tasker";
import { BufferToArrayBuffer } from "../utils";
import { ChunksCache } from "../chunks";
import { toArray, firstValueFrom, filter, map, of, mergeAll } from "rxjs";
import debug from 'debug';
import crypto from 'crypto';

const log = debug('jpeg:sinks');

async function sleep(t: number) {
  return new Promise(resolve => setTimeout(resolve, t));
}

class SinkDelegate {
  private sinks = [
    new WeiboSink(),
    new BilibiliSink(),
    new MemFileSink(),
    new TmpFileSink(),
  ];

  constructor() { }

  private getSink(matcher: string | SinkType): BasicSink {
    let sink: BasicSink;
    switch (typeof matcher) {
      case "string":
        sink = find(this.sinks, (s: BasicSink) => s.match(matcher));
        break;
      case "number":
        sink = find(this.sinks, (s: BasicSink) => s.type === matcher);
        break;
      default:
        console.error("unknown matcher", matcher);
        throw new Error("unknown matcher");
    }
    if (!sink) {
      throw new Error(`No sink found for ${matcher}`);
    }
    return sink;
  }

  async UploadMultiple(getBuf: (index: number) => Buffer, totalLength: number, config: SinkUploadConfig, uploadMsg: string) {
    const { task, source$, pool, abortCtr } = RxTask.Create(totalLength, config.concurrency);
    const usedConfig = config.cloneWithSignal(abortCtr.signal);
    log(`upload [${uploadMsg}] with config`, usedConfig);

    const ob = source$.pipe(
      task.createUnlimitedTasklet(async (index: number) => {
        const sink = (config.sinkType !== SinkType.unknown) ?
          this.getSink(config.sinkType) :
          sample(this.sinks);
        const buf = getBuf(index);
        const usedBits = usedConfig.usedBits || sink.DEFAULT_USED_BITS;
        const encoded = await pool.EncryptEncode(BufferToArrayBuffer(buf), 200, usedConfig.cloneWithUsedBits(usedBits));
        const hash = crypto.createHash("sha256");
        hash.update(buf);
        return {
          sink: sink,
          encoded: encoded,
          index: index,
          originalLength: buf.byteLength,
          usedBits: usedBits,
          checksum: hash.digest()
        }
      }),
      task.createLimitedTasklet(async (params) => {
        const urlString = await params.sink.DoUpload(params.encoded, config);
        if (config.sleepInterval > 0) {
          await sleep(config.sleepInterval);
        }
        const resourceID: PbResourceURL = {
          $type: PbResourceURL.$type,
          urlOneof: {
            $case: "url",
            url: urlString,
          }
        }
        const filePtr: PbFilePointer = {
          $type: PbFilePointer.$type,
          size: params.originalLength,
          usedBits: params.usedBits.toString(),
          checksum: params.checksum,
          resources: [resourceID],
        }
        return {
          index: params.index,
          encodedLength: params.encoded.byteLength,
          filePtr,
        }
      }),
      toArray(),
    );
    const result = await firstValueFrom(ob);
    assert(result.length === totalLength, "Upload result length mismatch");
    return {
      filePtrs: result.sort((a, b) => a.index - b.index).map((r) => r.filePtr),
      totalUploadSize: result.reduce((acc, r) => acc + r.encodedLength, 0),
    };
  }

  async DownloadSingle(chunk: PbFilePointer, config: SinkDownloadConfig) {
    const cached = await firstValueFrom(this.DownloadMultiple([chunk], config));
    return cached.decoded;
  }

  DownloadMultiple(chunks: PbFilePointer[], config: SinkDownloadConfig) {
    const { task, source$, pool, abortCtr } = RxTask.Create(chunks.length, config.concurrency);
    const usedConfig = config.cloneWithSignal(abortCtr.signal);
    log("download with config", usedConfig);

    const cache = new ChunksCache();
    return source$.pipe(
      task.createLimitedTasklet(async (index: number) => {
        const chunk = chunks[index];
        // only support one resource id now
        assert(chunk.resources.length === 1);
        const url = this.ResourceURLToString(chunk.resources[0]);
        const sink = this.getSink(url)
        const ab = await sink.DownloadRawData(url, config);
        return {
          ab,
          index: index,
        }
      }),
      task.createUnlimitedTasklet(async (params: { ab: ArrayBuffer, index: number }) => {
        const chunk = chunks[params.index];
        const decoded = await pool.DecodeDecrypt(params.ab, chunk.size, usedConfig);
        const hash = crypto.createHash("sha256");
        hash.update(decoded);
        if (!hash.digest().equals(chunk.checksum)) {
          throw new Error("checksum mismatch")
        }
        return {
          decoded: Buffer.from(decoded),
          index: params.index,
        }
      }),
      map((params) => of(...cache.onNewChunk(params))),
      mergeAll(),
    );
  }

  GetSinkAndID(url: string) {
    const sink = this.getSink(url);
    return {
      sink,
      id: sink.getImageIDFromUrl(url),
    }
  }

  private expandIDToUrl(type: number, sinkTypeMinor: number, id: string) {
    return this.getSink(type).ExpandIDToUrl(id, sinkTypeMinor);
  }

  ResourceURLToString(id: PbResourceURL): string {
    switch (id.urlOneof.$case) {
      case "url": {
        return id.urlOneof.url;
      }
      case "shortUrl": {
        const shortUrl = id.urlOneof.shortUrl;
        return this.expandIDToUrl(shortUrl.sinkType, shortUrl.sinkTypeMinor, EncodeResourceID(shortUrl.id));
      }
    }
  }
}

export const sinkDelegate = new SinkDelegate();