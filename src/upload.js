import { WeiboSink } from "./sinks/weibo.js";
import { BilibiliSink } from "./sinks/bilibili.js";
import { JpegDecoder } from "./jpeg-decoder/index.js";
import fetch from 'node-fetch';

const sinks = [ WeiboSink, BilibiliSink ];

/**
 * @param {*} original 
 * @param {*} usedBits 
 * @param {*} url 
 * @returns 
 */
async function validate(original, usedBits, url) {
  const ab = await fetch(url).then(res => res.arrayBuffer());
  // console.log("inflation rate:", (ab.byteLength / original.byteLength).toFixed(2));

  const dec = new JpegDecoder(usedBits, JpegDecoder.jpegjsDecoder);
  const decoded = Buffer.from(await dec.Read(ab, original.byteLength));
  // console.log(original, decoded);

  for (let i = 0; i < original.byteLength; i++) {
    if (original[i] !== decoded[i]) {
      // console.log(`index ${i}`, original[i], decoded[i]);
      return false;
    }
  }
  return true;
}

/**
 * @param {*} buf 
 * @param {*} usedBits 
 * @param {*} options 
 */
export async function TryUploadToAllSinks(buf, usedBits, options) {
  const results = [];
  for (let i = 0; i < sinks.length; i++) {
    try {
      const sink = new sinks[i](usedBits);
      const urls = await sink.Upload(buf, options);
      for (let j = 0; j < urls.length; j++) {
        const validated = await validate(buf, sink.usedBits, urls[j]);
        if (validated) {
          results.push({
            url: urls[j],
            usedBits: sink.usedBits,
            length: buf.byteLength,
          });
        }
      }
    } catch(err) {
      console.log(err);
    }
  }
  return results;
}
