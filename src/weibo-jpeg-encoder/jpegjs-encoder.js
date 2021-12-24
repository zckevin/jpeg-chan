import jpegjs from "../jpeg-js/index.js";

export function encodeImageData(targetImageData, imageQuality) {
  const targetImage = jpegjs.encode(targetImageData, imageQuality);
  return targetImage.data;
}