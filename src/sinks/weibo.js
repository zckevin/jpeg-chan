import * as https from "https"
import * as dotenv from "dotenv";
import fetch from 'node-fetch';

// weibo.com old version api
const UPLOAD_API_URL = "https://picupload.weibo.com/interface/pic_upload.php?data=1&p=1&url=weibo.com&markpos=1&logo=1&marks=0&app=miniblog&s=json&pri=null&file_source=1";

dotenv.config();

async function doUpload(imageBuffer) {
  const cookie = process.env.WEIBO_COOKIE;
  if (!cookie) {
    throw new Error("No WEIBO_COOKIE found in .env");
  }
  const options = {
    credentials: "include",
    headers: {
      "accept": "*/*",
      "connnection": "keep-alive",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja;q=0.6,da;q=0.5,zh-TW;q=0.4",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "none",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.53 Safari/537.36",
      "host": "picupload.weibo.com",
      "origin": "https://weibo.com",
      "Content-Type": "application/x-www-form-urlencoded",
      cookie,
    },
    referrerPolicy: "no-referrer-when-downgrade",
    method: "POST",
    mode: "cors",
    body: imageBuffer,
    agent: new https.Agent({
      keepAlive: true,
    }),
  };

  let status;
  return fetch(UPLOAD_API_URL, options)
    .then((res) => {
      status = res.status;
      return res.json();
    })
    .then((body) => {
      if (status !== 200) {
        console.log(body)
        throw new Error(`Weibo: upload failed, response with status code: ${status}`);
      }

      let pid, err;
      try {
        pid = body.data.pics.pic_1.pid;
      } catch(e) {
        err = e;
      }
      if (err || body.code != "A00006" || !pid) {
        console.log(body);
        throw new Error("Weibo: invalid response");
      }
      return pid;
    })
    .catch(err => {
      console.error("Weibo upload error", err);
      throw err;
    });
}

/**
 * @param {Buffer} imageBuffer 
 * @returns {Array<string>}
 */
export async function Upload(imageBuffer, useHttps = true) {
  const pid = await doUpload(imageBuffer);
  const protocol = useHttps ? "https" : "http";
  const CDN_SITES = ["wx1", "tva1"];
  return CDN_SITES.map(site => {
    return `${protocol}://${site}.sinaimg.cn/original/${pid}.jpg`;
  });
}
