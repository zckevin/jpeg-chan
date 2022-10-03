import { BasicSink, SinkType } from "./base";
import { UsedBits } from "../bits-manipulation";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { randomString } from "../utils";

export class MemFileSink extends BasicSink {
  private store = new Map<string, Buffer>();

  constructor() {
    super(
      0,
      new UsedBits(1, 4),
      /^memfile:\/\/(.*)\.jpg$/,
      SinkType.memfile
    );
  }

  async DoUpload(ab: ArrayBuffer, config: SinkUploadConfig) {
    const id = randomString();
    const url = this.ExpandIDToUrl(id);
    this.store.set(url, Buffer.from(ab));
    return url;
  }

  async DoNodeDownload(url: string, config: SinkDownloadConfig) {
    if (!this.store.has(url)) {
      throw new Error(`MemFileSink not found: ${url}`);
    }
    return this.store.get(url);
  }

  ExpandIDToUrl(id: string) {
    return `memfile://${id}.jpg`;
  }
}
