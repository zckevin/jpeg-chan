import { WeiboSink } from "./weibo.js";
import { BilibiliSink } from "./bilibili.js";
import _ from "lodash";

class SinkDelegate {
  constructor() {
    this.sinks = [
      new WeiboSink(),
      new BilibiliSink(),
    ];
  }

  /**
   * @param {Buffer} original data to upload 
   * @param {SinkUploadConfig} config
   * @returns {Object}
   */
  async Upload(original, config) {
    const sink = _.sample(this.sinks);
    return {
      url: await sink.Upload(original, config),
      usedBits: config.usedBits || sink.DEFAULT_USED_BITS,
    }
  }

  /**
   * @param {String} url 
   * @param {Number} size 
   * @param {SinkDownloadConfig} config
   * @returns Buffer
   */
  async Download(url, size, config) {
    const sink = _.find(this.sinks, s => s.match(url));
    if (!sink) {
      throw new Error(`No sink found for url: ${url}`);
    }
    return await sink.Download(url, size, config);
  }

  GetTypeAndID(url) {
    const sink = _.find(this.sinks, s => s.match(url));
    if (!sink) {
      throw new Error(`No sink found for url: ${url}`);
    }
    return {
      type: sink.type,
      id: sink.getImageIDFromUrl(url),
    }
  }

  ExpandIDToUrl(type, id) {
    const sink = _.find(this.sinks, s => s.type === type);
    if (!sink) {
      throw new Error(`No sink found for type: ${type}`);
    }
    return sink.expandIDToUrl(id);
  }
}

export const sinkDelegate = new SinkDelegate();