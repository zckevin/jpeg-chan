import { WeiboSink } from "./weibo";
import { BilibiliSink } from "./bilibili";
import { MemFileSink } from "./memfile";
import { TmpFileSink } from "./tmpfile";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { PbFilePointer } from "../../protobuf";
import { BasicSink } from "./base";
import { SinkType } from "../common-types";
import _, { find, sample } from "lodash";
import { assert } from "../assert";
import { RxTask } from "../rxjs-tasker";
import { BufferToArrayBuffer } from "../utils";
import { ChunksCache } from "../chunks";
import { toArray, firstValueFrom, filter, map, of, mergeAll } from "rxjs";
import debug from 'debug';

const log = debug('jpeg:sinks');

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

  async UploadMultiple(getBuf: (index: number) => Buffer, totalLength: number, config: SinkUploadConfig) {
    const { task, source$, pool, abortCtr } = RxTask.Create(totalLength, config.concurrency);
    const usedConfig = config.cloneWithSignal(abortCtr.signal);
    log("upload multiple with config", usedConfig);

    const ob = source$.pipe(
      task.createUnlimitedTasklet(async (index: number) => {
        const sink = (config.sinkType !== SinkType.unknown) ?
          this.getSink(config.sinkType) :
          sample(this.sinks);
        const ab = BufferToArrayBuffer(getBuf(index));
        const usedBits = usedConfig.usedBits || sink.DEFAULT_USED_BITS;
        const encoded = await pool.EncryptEncode(ab, 200, usedConfig.cloneWithUsedBits(usedBits));
        return {
          sink: sink,
          encoded: encoded,
          index: index,
          originalLength: ab.byteLength,
          usedBits: usedBits,
        }
      }),
      task.createLimitedTasklet(async (params) => {
        const url = await params.sink.DoUpload(params.encoded, config);
        const filePtr: PbFilePointer = {
          $type: PbFilePointer.$type,
          url,
          usedBits: params.usedBits.toString(),
          size: params.originalLength,
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

  async DownloadSingleFile(chunk: PbFilePointer, config: SinkDownloadConfig) {
    log("download with config", config);
    return await this.getSink(chunk.url).DownloadDecodeDecrypt(chunk.url, chunk.size, config);
  }

  DownloadMultiple(chunks: PbFilePointer[], config: SinkDownloadConfig) {
    const { task, source$, pool, abortCtr } = RxTask.Create(chunks.length, config.concurrency);
    const usedConfig = config.cloneWithSignal(abortCtr.signal);
    log("download multiple with config", usedConfig);

    const cache = new ChunksCache();
    return source$.pipe(
      task.createLimitedTasklet(async (index: number) => {
        const chunk = chunks[index];
        const sink = this.getSink(chunk.url)
        const ab = await sink.DownloadRawData(chunk.url, config);
        return {
          ab,
          index: index,
        }
      }),
      task.createUnlimitedTasklet(async (params: { ab: ArrayBuffer, index: number }) => {
        const chunk = chunks[params.index];
        const decoded = await pool.DecodeDecrypt(params.ab, chunk.size, usedConfig);
        return {
          decoded: decoded,
          index: params.index,
        }
      }),
      map((params) => of(...cache.onNewChunk(params))),
      mergeAll(),
    );
  }

  GetTypeAndID(url: string) {
    const sink = this.getSink(url);
    return {
      sinkType: sink.type,
      id: sink.getImageIDFromUrl(url),
    }
  }

  ExpandIDToUrl(type: number, id: string) {
    return this.getSink(type).ExpandIDToUrl(id);
  }
}

export const sinkDelegate = new SinkDelegate();