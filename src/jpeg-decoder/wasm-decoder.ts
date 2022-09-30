import { Decode } from "nanojpeg-wasm";
import { RGB2Y } from "../utils"

export async function getJpegChromaComponent(ab: ArrayBuffer) {
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
