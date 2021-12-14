const fs = require("fs");
const assert = require("assert").strict;
const fetch = require("node-fetch");
const randomBytes = require("random-bytes");

const { uploadToWeibo, getWeiboPicUrl } = require("./upload_to_weibo");
const weiboCookies = require("./cookies");

const GIF_FILE_BLOB = fs.readFileSync("./image_templates/foo.gif");

class WeiboGifChannel {
  constructor() {}

  write(buf) {
    const concatedFileLength = buf.length + GIF_FILE_BLOB.length;
    assert.ok(
      concatedFileLength < 20 * 1024 * 1024,
      "Gif file should not be larger than 20MB"
    );
    const concatedFileBlob = new Uint8Array(concatedFileLength);
    concatedFileBlob.set(GIF_FILE_BLOB, 0);
    concatedFileBlob.set(buf, GIF_FILE_BLOB.length);

    return new Promise(function (resolve, reject) {
      uploadToWeibo(concatedFileBlob, weiboCookies, (err, picId) => {
        if (err) {
          return reject(err);
        }
        resolve(getWeiboPicUrl(picId));
      });
    });
  }

  read(picUrl) {
    const that = this;
    return new Promise(function (resolve, reject) {
      fetch(picUrl)
        .then((res) => res.buffer())
        .then((buf) => {
          if (buf.length < GIF_FILE_BLOB.length) {
            throw new Error(`GIF file ${picUrl} short read.`);
          }
          resolve(buf.slice(GIF_FILE_BLOB.length));
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

async function run() {
  const ch = new WeiboGifChannel();
  const n = parseInt(process.argv[2]) || 1024;
  randomBytes(n).then(async (buf) => {
    console.time("GIF rtt");
    console.time("GIF upload");
    const picUrl = await ch.write(buf);
    console.timeEnd("GIF upload");
    console.time("GIF download");
    const buf2 = await ch.read(picUrl);
    console.timeEnd("GIF download");
    console.timeEnd("GIF rtt");
    assert.deepEqual(new Uint8Array(buf2), new Uint8Array(buf));
  });
}
run();

module.exports = WeiboGifChannel;
