const fs = require("fs");
const assert = require("assert").strict;
const fetch = require("node-fetch");
const randomBytes = require("random-bytes");

const jpeg = require("./jpeg-js");
const bits = require("./bits_manipulation");
const utils = require("./utils");
const { uploadToWeibo, getWeiboPicUrl } = require("./upload_to_weibo");
const weiboCookies = require("./cookies");

function selectTemplateImageBySize(dataSize) {
  let root = "./image_templates";
  return `${root}/640.jpg`;
  if (dataSize <= 64) {
    return `${root}/8.jpg`;
  } else if (dataSize < 640) {
    return `${root}/32.jpg`;
  } else if (dataSize < 1440) {
    return `${root}/48.jpg`;
  } else if (dataSize < 2560) {
    return `${root}/64.jpg`;
  } else if (dataSize < 256000) {
    return `${root}/640.jpg`;
  } else {
  }
}

class WeiboJpegChannel {
  // @usedBitsN: Integer, how many significant side bits are used as data in a byte(8 bits)
  constructor(usedBitsN) {
    this.usedBitsN = usedBitsN;
    this.unusedBitsN = 8 - usedBitsN;

    // mask try to make byte value suffer from JPEG DCT
    // so we make it half to the *unused* bits value, e.g.
    // | 1 0 0 1 x x x x |, usedBits = 4
    // | 0 0 0 0 0 1 1 1 | <- mask value := (1<<3)-1
    // | 1 0 0 1 0 1 1 1 |, final byte
    this.mask = (1 << (this.unusedBitsN - 1)) - 1;
  }

  _encode(buf) {
    if (buf.length <= 0) {
      return null;
    }
    const nextByteFn = bits.serializeFromBuffer(
      buf,
      this.unusedBitsN,
      this.mask
    );
    const dataLength = Math.ceil((buf.length * 8) / this.usedBitsN);
    const templateImageFilePath = selectTemplateImageBySize(dataLength);
    const rawImageData = jpeg.writeDataToRawImage(
      templateImageFilePath,
      fs.readFileSync(templateImageFilePath),
      nextByteFn
    );
    console.time("jpeg encode");
    const jpegImageObject = jpeg.encode(
      rawImageData,
      100 /* highest encode quality */
    );
    console.timeEnd("jpeg encode");
    return jpegImageObject.data;
  }

  write(buf) {
    const encoded = this._encode(buf);
    return new Promise(function (resolve, reject) {
      if (!encoded) {
        resolve("");
      }
      uploadToWeibo(encoded, weiboCookies, (err, picId) => {
        if (err) {
          return reject(err);
        }
        resolve(getWeiboPicUrl(picId));
      });
    });
  }

  _parse(imageBuf, dataLength, usedbitsN) {
    const components = jpeg.getImageComponents(imageBuf);
    assert.strictEqual(components.length, 1);

    let recved = [];
    // let counter = 0;
    components[0].lines.map((line) => {
      line.map((byte) => {
        // ???
        // if (counter++ >= dataLength + 10) {
        //   return;
        // }
        recved.push(byte);
      });
    });

    const nextByteFn = bits.parseFromBuffer(
      Buffer.from(recved),
      usedbitsN,
      dataLength
    );
    recved = utils.drainN(nextByteFn, dataLength);
    if (recved.length < dataLength) {
      throw new Error("Short read.");
    }
    return recved;
  }

  read(picUrl, dataLength) {
    const that = this;
    return new Promise(function (resolve, reject) {
      fetch(picUrl)
        .then((res) => res.buffer())
        .then((buf) => {
          const data = that._parse(buf, dataLength, that.usedBitsN);
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  dryRun(buf) {
    console.time("dryRun _encode");
    const encoded = this._encode(buf);
    console.timeEnd("dryRun _encode");

    console.time("dryRun _parse");
    const decoded = this._parse(encoded, buf.length, this.usedBitsN);
    console.timeEnd("dryRun _parse");
    assert.deepEqual(new Uint8Array(decoded), new Uint8Array(buf));
  }
}

async function run(srcBuf) {
  const imageCh = new WeiboJpegChannel(4);
  // const buf = fs.readFileSync("/home/zc/PROJECTS/weibo-jpeg-channel/node_modules/node-fetch/README.md")

  imageCh.dryRun(srcBuf);

  console.time("real run");
  {
    const imageUrl = await imageCh.write(srcBuf);
    console.log(imageUrl);

    const dstBuf = await imageCh.read(imageUrl, srcBuf.length);
    // utils.debugPrint(srcBuf, utils.convert.dec2hex);
    // utils.debugPrint(dstBuf, utils.convert.dec2hex);
    assert.deepEqual(new Uint8Array(dstBuf), new Uint8Array(srcBuf));
  }
  console.timeEnd("real run");
}

globalThis.perf = function perf() {
  randomBytes(30).then((buf) => run(buf));
};

for (let i = 0; i < 1; i++) {
  perf();
}
