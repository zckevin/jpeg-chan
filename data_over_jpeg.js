const fs = require("fs")
const assert = require('assert').strict;
const fetch = require("node-fetch")

const jpeg = require("./jpeg-js")
const bits = require("./bits_manipulation")
const utils = require("./utils")
const uploadToWeibo = require("./upload_to_weibo")

// trim newline in txt
const weiboCookies = fs.readFileSync("./weibo_cookies.txt").toString().trim()

function selectTemplateImageBySize(dataSize) {
    let root = "./image_templates"
    if (dataSize <= 64) {
        return `${root}/8.jpg`
    } else if (dataSize < 640) {
        return `${root}/32px.jpg`
    } else if (dataSize < 1440) {
        return `${root}/48px.jpg`
    } else if (dataSize < 2560) {
        return `${root}/64px.jpg`
    } else if (dataSize < 256000) {
        return `${root}/640px.jpg`
    } else {
    }
}

function parseOverlayData(imageBuf, dataLength, nbits) {
    let components = jpeg.getImageComponents(imageBuf)
    assert.strictEqual(components.length, 1)
    
    let recved = [];
    (function() {
        let counter = 0;
        components[0].lines.map(line => {
            line.map(b => {
                if (counter++ >= dataLength + 10) {
                    return
                }
                recved.push(b)
            })
        })
    })()
    let nextByteFn = bits.getFromBuffer(Buffer.from(recved), nbits, dataLength)
    recved = utils.getUntilNull(nextByteFn).slice(0, dataLength)
    return recved
}

class WeiboPicChannel {
    constructor(nbits, mask) {
        this.nbits = 5
        this.mask = 0x03
    }

    write(buf) {
        let that = this;
        return new Promise(function(resolve, reject) {
            if (buf.length <= 0) {
                return resolve(null)
            }
            let nextByteFn = bits.drainFromBuffer(buf, that.nbits, that.mask)
            let dataLength = Math.ceil(buf.length * 8 / that.nbits)
            let imageData = jpeg.writeDataToImage(
                // fs.readFileSync("./640px.template.jpg"),
                fs.readFileSync(selectTemplateImageBySize(dataLength)),
                nextByteFn,
            )
            let jpegImage  = jpeg.encode(imageData, 100);
            uploadToWeibo(jpegImage.data, weiboCookies, (err, picId) => {
                if (err) {
                    return reject(err)
                }
                let u = `https://wx3.sinaimg.cn/large/${picId}.jpg`;
                resolve(u)
            })
        })
    }

    read(picUrl, dataLength) {
        let that = this;
        return new Promise(function(resolve, reject) {
            fetch(picUrl)
                .then(res => res.buffer())
                .then(buf => {
                    let data = parseOverlayData(buf, dataLength, that.nbits)
                    resolve(data)
                })
        })
    }
}

(async function() {
    let ch = new WeiboPicChannel()
    let buf = Buffer.from([1, 28, 143, 76, 98, 211])
    let start = new Date()

    let u = await ch.write(buf)
    console.log(u)
    let data = await ch.read(u, buf.length)
    utils.debugPrint(buf, utils.convert.dec2hex)
    utils.debugPrint(data, utils.convert.dec2hex)
    console.log(new Date() - start, "ms")
})()

