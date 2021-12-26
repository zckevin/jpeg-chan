import jpegjs from "../jpeg-js/index.js";
import { assert } from "../assert.js";

/**
 * @param {ArrayBuffer} ab
 * @param {number} width
 * @param {number} height
 * @returns {Promise}
 */
export async function getJpegChromaComponent(ab) {
  const {width, height, components} = jpegjs.getImageComponents(ab);
  assert(width == height && width > 0);
  assert(components.length === 1);

  let chromaComponent = new Uint8ClampedArray(width * height);
  let counter = 0;
  assert(components[0].lines.length >= width);
  for (let i = 0; i < components[0].lines.length; i++) {
    const line = components[0].lines[i];
    for (let j = 0; j < width; j++) {
      chromaComponent[counter++] = line[j];
    }
  }
  return chromaComponent;
}
