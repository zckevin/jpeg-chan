import { WeiboSink } from "./weibo";
import { BilibiliSink } from "./bilibili";
import _ from "lodash";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { PbFileChunk } from "../../protobuf";
import { BasicSink, SinkType } from "./base";
import { Observable } from "rxjs"

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
      url: await sink.Upload(original, config),
      usedBits: config.usedBits || sink.DEFAULT_USED_BITS,
    }
  }

  async DownloadSingeFile(chunk: PbFileChunk, config: SinkDownloadConfig) {
    return await this.getSink(chunk.url).DownloadDecodeDecrypt(chunk.url, chunk.size, config);
  }

  async DownloadMultipleFiles(chunks: PbFileChunk[], config: SinkDownloadConfig) {
    const ob = new Observable<ArrayBuffer>((observer) => {
      (async () => {
        for (const chunk of chunks) {
          observer.next(await this.DownloadSingeFile(chunk, config));
        }
        observer.complete();
      })();
    });
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