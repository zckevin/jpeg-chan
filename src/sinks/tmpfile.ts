import { BasicSink } from "./base";
import { SinkType } from "../common-types";
import { UsedBits } from "../bits-manipulation";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { randomString } from "../utils";
import path from "path";
import os from "os";
import fs from "fs";
import fsExtra from "fs-extra";

export class TmpFileSink extends BasicSink {
  private rootDir = path.join(os.tmpdir(), "tmpfile");

  constructor() {
    super(
      0,
      new UsedBits(1, 4),
      [/^tmpfile:\/\/(.*)\.jpg$/],
      SinkType.tmpfile
    );
    fsExtra.ensureDirSync(this.rootDir);
  }

  async DoUpload(ab: ArrayBuffer, config: SinkUploadConfig) {
    const id = randomString();
    const url = this.ExpandIDToUrl(id);
    const fileName = `${id}.jpg`;
    fs.writeFileSync(path.join(this.rootDir, fileName), Buffer.from(ab));
    return url;
  }

  async DoNodeDownload(url: string, config: SinkDownloadConfig) {
    const fileName = url.replace("tmpfile://", "");
    const filePath = path.join(this.rootDir, fileName);
    if (!fsExtra.existsSync(filePath)) {
      throw new Error(`TmpFileSink not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  }

  ExpandIDToUrl(id: string) {
    return `tmpfile://${id}.jpg`;
  }
}
