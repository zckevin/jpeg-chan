import { BasicSink, SinkType } from "./base";
import { UsedBits } from "../bits-manipulation";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { randomString } from "../utils";
import fsExtra from 'fs-extra';
import fs from 'fs';
import path from 'path';
import os from "os";

export class TmpFileSink extends BasicSink {
  private rootDir = path.join(os.tmpdir(), 'file-sink');

  constructor() {
    super(
      0,
      new UsedBits(1, 4),
      // mind the backslashs on windows
      /.*file-sink(.*)\.jpg$/,
      SinkType.tmpfile
    );
    fsExtra.ensureDirSync(this.rootDir);
  }

  async DoUpload(ab: ArrayBuffer, config: SinkUploadConfig) {
    const id = randomString();
    const url = this.ExpandIDToUrl(id);
    fsExtra.writeFileSync(url, Buffer.from(ab));
    return url;
  }

  async DoNodeDownload(url: string, config: SinkDownloadConfig) {
    if (!fsExtra.pathExistsSync(url)) {
      throw new Error("File not found");
    }
    return fs.readFileSync(url);
  }

  ExpandIDToUrl(id: string) {
    return path.join(this.rootDir, `${id}.jpg`);
  }
}
