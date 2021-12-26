/**
 * Refer to https://github.com/xlzy520/typora-plugin-bilibili
 */

import * as dotenv from "dotenv";
import FormData from "form-data";
import http from "http";
import { BasicSink } from "./base.js";

dotenv.config();

/**
 * 
 * @param {ArrayBuffer} ab 
 * @returns {String} url
 */
async function upload(ab) {
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
    const req = http.request({
      method: 'post',
      host: 'api.vc.bilibili.com',
      path: '/api/v1/drawImage/upload',
      headers: headers,
    }, function(res) {
      let str='';
      res.on('data',function(buffer){
          str += buffer; // 用字符串拼接
        }
      );
      res.on('end',()=>{
        const result = JSON.parse(str);
        const { message: msg, data } = result;
        if (msg === 'success') {
          const url = data.image_url.replace('http', 'https')
          return resolve(url);
        }
        console.log(result);
        if (msg === '请先登录') {
          console.log('token过期了，请及时更新命令行中的token');
        }
        reject(new Error("Bilibili: upload failed"));
      });
    });
    form.pipe(req);
  });
}


export class BilibiliSink extends BasicSink {
  constructor(usedBitsN = 6) {
    super(usedBitsN);
  }

  async doUpload(ab, options) {
    const url = await upload(ab);
    // https://jxyblog.top/article/e3efd7b7.html
    return [
     // `${url}@100q.jpg`, // higest compression rate
      `${url}`, // original
    ]
  }
}