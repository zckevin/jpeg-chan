import jpegjs from "../jpeg-js/index.js";

export async function encodeImageData(targetImageData, imageQuality) {
  const targetImage = jpegjs.encode(targetImageData, imageQuality);
  return targetImage.data;
}