import { EncoderImageData } from "./index"
import jpegjs from "../jpeg-js/index.js";

export async function encodeImageData(targetImageData: EncoderImageData, imageQuality: number) {
  const targetImage = jpegjs.encode(targetImageData, imageQuality);
  return targetImage.data;
}