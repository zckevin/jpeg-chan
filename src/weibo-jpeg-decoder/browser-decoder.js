import * as utils from "../utils.js";
import { assert } from "../assert.js";

// TODO: add comments
function forceNewFrameInChrome() {
  let el = document.createElement("p");
  el.innerText = "1";
  el.style.position = "absolute";
  el.style.fontSize = "1px";
  document.body.append(el);
}

async function decodeJpegInBrowser(ab, width, height) {
  const perfMarkerJpegDecode = utils.randomString();
  const perfMarkerJpegCanvas = utils.randomString();

  // create image blob url
  const blob = new Blob([ ab ], { type: "image/jpeg" } );
  const urlCreator = window.URL || window.webkitURL;
  const imageBlobUrl = urlCreator.createObjectURL(blob);

  const img = new Image();
  img.src = imageBlobUrl;
  img.decoding = "sync"; // actually does not make any difference...
  img.onload = () => {
    forceNewFrameInChrome();
    performance.mark(perfMarkerJpegDecode);
  };
  await img.decode();
  performance.measure("jpeg decode", perfMarkerJpegDecode);

  performance.mark(perfMarkerJpegCanvas);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context');
  }
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  return imageData.data;
}

// https://stackoverflow.com/a/14697130/671376
function RGB2Y(r, g, b) {
  return ((19595 * r + 38470 * g + 7471 * b ) >> 16);
}

/**
 * @param {ArrayBuffer} ab
 * @param {number} width
 * @param {number} height
 * @returns {Promise}
 */
export async function getJpegChromaComponent(ab, width, height) {
  const data = await decodeJpegInBrowser(ab, width, height);
  assert(data.length > 0 && data.length % 4 === 0);
  const length = data.length / 4;

  let chromaComponent = new Uint8ClampedArray(length);
  for (let i = 0; i < length; i++) {
    const r = data[4 * i];
    const g = data[4 * i + 1];
    const b = data[4 * i + 2];
    const a = data[4 * i + 3];
    chromaComponent[i] = RGB2Y(r, g, b);
  }
  return chromaComponent;
}
