import { WeiboSink } from "./weibo";
import { BilibiliSink } from "./bilibili";
import { TmpFileSink } from "./tmpfile";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { PbFileChunk } from "../../protobuf";
import { BasicSink, SinkType } from "./base";
import { WorkerPool } from "../workers";
import { find, sample } from "lodash";
import { Observable, mergeMap, toArray, firstValueFrom, from } from "rxjs";
import { AbortController } from "fetch-h2";

interface WorkerTask {
  ab: ArrayBuffer;
  index: number;
}

class SinkDelegate {
  private sinks = [
    new WeiboSink(),
    new BilibiliSink(),
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
      sample(this.sinks);
    const usedConfig = config.usedBits ? config : config.cloneWithUsedBits(sink.DEFAULT_USED_BITS);
    return {
      url: await sink.UploadBuffer(original, usedConfig),
      usedBits: usedConfig.usedBits,
    }
  }

  async DownloadSingleFile(chunk: PbFileChunk, config: SinkDownloadConfig) {
    return await this.getSink(chunk.url).DownloadDecodeDecrypt(chunk.url, chunk.size, config);
  }

  private downloadMultipleChunks(chunks: PbFileChunk[], config: SinkDownloadConfig, onError: (err: any) => void) {
    return new Observable<WorkerTask>((observer) => {
      (async () => {
        const promises = chunks.map(async (chunk, index) => {
          const sink = this.getSink(chunk.url)
          const task: WorkerTask = {
            index,
            ab: await sink.DownloadRawData(chunk.url, config),
          };
          observer.next(task);
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
    });
  }

  async DownloadMultipleFiles(chunks: PbFileChunk[], config: SinkDownloadConfig) {
    const pool = new WorkerPool();
    const abortCtr = new AbortController();
    const usedConfig = config.cloneWithSignal(abortCtr.signal);
    const onError = async (err: any) => {
      console.error("Error in worker pool", err);
      abortCtr.abort();
      await pool.destroy();
    }
    const doWorkerTask = async (task: WorkerTask) => {
      return {
        ab: await pool.DecodeDecrypt(task.ab, chunks[task.index].size, usedConfig.usedBits, usedConfig),
        index: task.index,
      }
    }
    const source$ = this.downloadMultipleChunks(chunks, usedConfig, onError).pipe(
      mergeMap((task: WorkerTask) => from(doWorkerTask(task))),
      toArray(),
    );
    const result = await firstValueFrom(source$);
    console.log(result);
    await pool.destroy();
    return result.sort((a, b) => a.index - b.index).map((r) => r.ab);
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