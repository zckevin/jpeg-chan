import { WeiboSink } from "./weibo";
import { BilibiliSink } from "./bilibili";
import _ from "lodash";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { BasicSink } from "./base";

class SinkDelegate {
  private sinks = [
    new WeiboSink(),
    new BilibiliSink(),
  ];

  constructor() { }

  async Upload(original: Buffer, config: SinkUploadConfig) {
    let sink: BasicSink;
    if (config.sinkType) {
      sink = _.find(this.sinks, (s: BasicSink) => s.type === config.sinkType)!;
      if (!sink) {
        throw new Error(`No sink found for type: ${config.sinkType}`);
      }
    } else {
      sink = _.sample(this.sinks)!;
    }
    return {
      url: await sink.Upload(original, config),
      usedBits: config.usedBits || sink.DEFAULT_USED_BITS,
    }
  }

  async Download(url: string, size: number, config: SinkDownloadConfig) {
    const sink = _.find(this.sinks, (s: BasicSink) => s.match(url));
    if (!sink) {
      throw new Error(`No sink found for url: ${url}`);
    }
    return await sink.Download(url, size, config);
  }

  GetTypeAndID(url: string) {
    const sink = _.find(this.sinks, (s: BasicSink) => s.match(url));
    if (!sink) {
      throw new Error(`No sink found for url: ${url}`);
    }
    return {
      sinkType: sink.type,
      id: sink.getImageIDFromUrl(url),
    }
  }

  ExpandIDToUrl(type: number, id: string) {
    const sink = _.find(this.sinks, (s: BasicSink) => s.type === type);
    if (!sink) {
      throw new Error(`No sink found for type: ${type}`);
    }
    return sink.ExpandIDToUrl(id);
  }
}

export const sinkDelegate = new SinkDelegate();