// load jpeg using webpack file-loader
// @ts-ignore
import imageFileUrl from "../../image_templates/test.jpg"

export default function loadJpegForTesting() {
  const url = imageFileUrl;
  const byteLength = 652423;

  return {
    url,
    byteLength,
    width: 8,
    height: 8,
  }
}
