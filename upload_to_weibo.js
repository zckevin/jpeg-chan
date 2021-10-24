const fetch = require("node-fetch");
const parseXmlString = require("xml2js").parseString;
const https = require("https");
const debug = require("debug")("weiboUpload");

function uploadToWeibo(imageBuffer, weiboCookie, cb) {
  fetch(
    "https://picupload.weibo.com/interface/pic_upload.php?s=xml&ori=1&data=1&rotate=0&wm=&app=miniblog&mime=image%2Fjpeg",
    {
      credentials: "include",
      headers: {
        accept: "*/*",
        connnection: "keep-alive",
        "accept-language":
          "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja;q=0.6,da;q=0.5,zh-TW;q=0.4",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "none",
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.53 Safari/537.36",
        host: "picupload.weibo.com",
        origin: "https://picupload.weibo.com",
        cookie: weiboCookie,
      },
      referrerPolicy: "no-referrer-when-downgrade",
      method: "POST",
      mode: "cors",
      body: imageBuffer,
      // TODO: maybe not working, but whatever.
      agent: new https.Agent({
        keepAlive: true,
      }),
    }
  )
    .then((res) => {
      // console.log(res.headers)
      return res.text();
    })
    .then((body) => {
      debug("upload response", body);
      parseXmlString(body, function (err, result) {
        // console.log(err, result.root.code[0], result.root.pics[0].pic_1[0].pid[0])
        cb(err, result.root.pics[0].pic_1[0].pid[0]);
      });
    });
}

function getWeiboPicUrl(picId) {
  // use HTTP instead of HTTPS?
  // wx1/2/3/... ?
  return `http://wx3.sinaimg.cn/original/${picId}.gif`;
}

module.exports = {
  uploadToWeibo,
  getWeiboPicUrl,
};
