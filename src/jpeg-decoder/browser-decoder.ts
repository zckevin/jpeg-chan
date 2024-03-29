import * as utils from "../utils";
import { assert } from "../assert";

// TODO: add comments
function forceNewFrameInChrome() {
  let el = document.createElement("p");
  el.innerText = "1";
  el.style.position = "absolute";
  el.style.fontSize = "1px";
  document.body.append(el);
}

function debugPrintPerformance(entry: PerformanceEntry) {
  console.log(entry.name, entry.duration);
}

async function decodeJpegInBrowser(ab: ArrayBuffer) {
  const perfMarkerJpegDecode = utils.randomString();
  const perfMarkerJpegCanvas = utils.randomString();

  // create image blob url
  const blob = new Blob([ ab ], { type: "image/jpeg" } );
  const urlCreator = window.URL || window.webkitURL;
  const imageBlobUrl = urlCreator.createObjectURL(blob);

  const img = new Image();
  img.src = imageBlobUrl;
  img.decoding = "sync"; // Does not make any difference...
  img.onload = () => {
    forceNewFrameInChrome();
    performance.mark(perfMarkerJpegDecode);
  };
  await img.decode();
  debugPrintPerformance(
    performance.measure("browserDecoder:jpeg decode", perfMarkerJpegDecode)
  );

  performance.mark(perfMarkerJpegCanvas);
  const {width, height} = img;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context');
  }
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  debugPrintPerformance(
    performance.measure("browserDecoder:jpeg canvas", perfMarkerJpegCanvas)
  );

  return imageData.data;
}

export async function getJpegChromaComponent(ab: ArrayBuffer) {
  const data = await decodeJpegInBrowser(ab);
  assert(data.length > 0 && data.length % 4 === 0);
  const length = data.length / 4;

  let chromaComponent = new Uint8ClampedArray(length);
  for (let i = 0; i < length; i++) {
    const r = data[4 * i];
    const g = data[4 * i + 1];
    const b = data[4 * i + 2];
    const a = data[4 * i + 3];
    chromaComponent[i] = utils.RGB2Y(r, g, b);
  }
  return chromaComponent;
}
