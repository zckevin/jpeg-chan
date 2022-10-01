import { WeiboSink } from "./weibo";
import { BilibiliSink } from "./bilibili";
import _ from "lodash";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { PbFileChunk } from "../../protobuf";
import { BasicSink, SinkType } from "./base";
import { Observable, map, toArray, firstValueFrom } from "rxjs";
import { AbortController } from "fetch-h2";
import { WorkerPool } from "../workers";

interface WorkerTask {
  ab: ArrayBuffer;
  index: number;
}

class SinkDelegate {
  private sinks = [
    new WeiboSink(),
    new BilibiliSink(),
  ];

  constructor() { }

  private getSink(matcher: string | SinkType): BasicSink {
    let sink: BasicSink;
    switch (typeof matcher) {
      case "string":
        sink = _.find(this.sinks, (s: BasicSink) => s.match(matcher));
        break;
      case "number":
        sink = _.find(this.sinks, (s: BasicSink) => s.type === matcher);
        break;
      default:
        throw new Error("Invalid matcher");
    }
    if (!sink) {
      throw new Error(`No sink found for ${matcher}`);
    }
    return sink;
  }

  async Upload(original: Buffer, config: SinkUploadConfig) {
    const sink = (config.sinkType !== SinkType.unknown) ?
      this.getSink(config.sinkType) :
      _.sample(this.sinks);
    return {
      url: await sink.UploadBuffer(original, config),
      usedBits: config.usedBits || sink.DEFAULT_USED_BITS,
    }
  }

  async DownloadSingleFile(chunk: PbFileChunk, config: SinkDownloadConfig) {
    return await this.getSink(chunk.url).DownloadDecodeDecrypt(chunk.url, chunk.size, config);
  }

  async DownloadMultipleFiles(chunks: PbFileChunk[], config: SinkDownloadConfig) {
    const abortCtr = new AbortController();
    const usedConfig = config.cloneWithSignal(abortCtr.signal);
    const pool = new WorkerPool();

    const onError = async (err: any) => {
      console.log("Error in worker pool", err);
      abortCtr.abort();
      await pool.destroy();
    }
    const source$ = new Observable<WorkerTask>((observer) => {
      (async () => {
        const promises = chunks.map(async (chunk, index) => {
          const sink = this.getSink(chunk.url)
          observer.next({
            index,
            ab: await sink.DownloadRawData(chunk.url, usedConfig),
          });
        });
        Promise.all(promises)
          .then(() => {
            observer.complete()
          })
          .catch((err) => {
            onError(err);
            observer.error(err)
          });
      })();
    }).pipe(
      map(async (task: WorkerTask) => {
        return {
          ab: await pool.DecodeDecrypt(task.ab, chunks[task.index].size, usedConfig.usedBits, usedConfig),
          index: task.index,
        }
      }),
      toArray(),
    );
    const result = await firstValueFrom(source$);
    console.log(result);
    await pool.destroy();
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