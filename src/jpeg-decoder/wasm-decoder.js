import { Decode } from "nanojpeg-wasm";
import { RGB2Y } from "../utils.js"

/**
 * @param {ArrayBuffer} ab
 * @param {number} width
 * @param {number} height
 * @returns {Promise}
 */
export async function getJpegChromaComponent(ab) {
  const result = await Decode(ab);
  const { isGrey, width, height, data } = result;
  const chromaComponent = new Uint8ClampedArray(width * height);
  const components = isGrey ? 1 : 3;
  const length = width * height * components;
  for (let i = 0; i < length; i++) {
    const r = data[components * i];
    const g = data[components * i + 1];
    const b = data[components * i + 2];
    chromaComponent[i] = RGB2Y(r, g, b);
  }
  return chromaComponent;
}
