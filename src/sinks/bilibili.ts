/**
 * Refer to https://github.com/xlzy520/typora-plugin-bilibili
 */

import { BasicSink } from "./base";
import { SinkType } from "../common-types";
import { UsedBits } from "../bits-manipulation";
import { SinkUploadConfig, SinkDownloadConfig } from "../config";
import { NodeFetch } from "../fetch"
import { range, sample } from "lodash";
import * as dotenv from "dotenv";
import FormData from "form-data";
import https from "https";
import { Buffer } from "buffer";
import debug from 'debug';

const log = debug('jpeg:http:bilibili');

dotenv.config();

async function upload(ab: ArrayBuffer): Promise<string> {
  const SESSDATA = process.env.BILIBILI_SESSION;
  if (!SESSDATA) {
    throw new Error("No BILIBILI_SESSION found in .env");
  }
  const form = new FormData();
  form.append('file_up', Buffer.from(ab), {
    filename: "1.jpg",
    contentType: "image/jpeg"
  });
  form.append('category', 'daily');
  form.append('biz', 'draw');

  const headers = form.getHeaders();
  headers.Cookie = `SESSDATA=${SESSDATA}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'post',
      host: 'api.vc.bilibili.com',
      path: '/api/v1/drawImage/upload',
      headers: headers,
    }, function (res) {
      let str = '';
      res.on('data', function (buffer) {
        str += buffer; // 用字符串拼接
      }
      );
      res.on('end', () => {
        const result = JSON.parse(str);
        log("Upload result:", result);
        const { message: msg, data } = result;
        if (msg === '0') {
          const url = data.image_url.replace('http', 'https')
          return resolve(url);
        }
        if (msg === '请先登录') {
          console.log('token过期了，请及时更新命令行中的token');
        }
        reject(new Error(`Bilibili upload failed: ${str}`));
      });
    });
    form.pipe(req);
  });
}


export class BilibiliSink extends BasicSink {
  constructor() {
    super(
      200,
      new UsedBits(1, 5),
      /https?:\/\/i\d\.hdslb\.com\/bfs\/album\/([0-9a-z]+)\.jpe?g/,
      SinkType.bilibili
    );
    this.supportsHTTP2 = false;
  }

  async DoUpload(ab: ArrayBuffer, config: SinkUploadConfig) {
    const url = await upload(ab);
    // https://jxyblog.top/article/e3efd7b7.html
    // return [
    //  // `${url}@100q.jpg`, // higest compression rate
    //   `${url}`, // original
    // ]
    return url;
  }

  async DoNodeDownload(url: string, config: SinkDownloadConfig) {
    const randomCDNUrl = url.replace(
      "i0", `i${sample(range(0, 4))}`
    );
    return NodeFetch(randomCDNUrl, config.signal);
  }

  ExpandIDToUrl(id: string) {
    return `https://i0.hdslb.com/bfs/album/${id}.jpg`;
  }
}
