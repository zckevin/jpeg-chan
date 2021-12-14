// load jpeg using webpack file-loader
import imageFileUrl from "../../image_templates/640.jpg"

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
