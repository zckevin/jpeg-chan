import jpegjs from "../jpeg-js/index.js";
import { assert } from "../assert.js";

/**
 * @param {ArrayBuffer} ab
 * @param {number} width
 * @param {number} height
 * @returns {Promise}
 */
export async function getJpegChromaComponent(ab, width, height) {
  const components = jpegjs.getImageComponents(ab);
  assert(components.length === 1);

  let chromaComponent = new Uint8ClampedArray(width * height);
  let counter = 0;
  components[0].lines.map(line => {
    line.map(byte => {
      // ???
      // if (counter++ >= dataLength + 10) {
      //   return;
      // }
      chromaComponent[counter++] = byte;
    });
  });
  return chromaComponent;
}

