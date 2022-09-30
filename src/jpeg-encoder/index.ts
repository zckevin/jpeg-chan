import { assert } from "../assert";
import { JpegChannel } from "../channels/jpeg-channel";
import { serialize, UsedBits, keepMostSignificantNBits } from "../bits-manipulation";
import jpegjs from "../jpeg-js/index.js";

export enum EncoderType {
  jpegjsEncoder = 1,
  wasmEncoder,
}

export interface Encoder {
  encodeImageData: (targetImageData: EncoderImageData, imageQuality: number) => Promise<Buffer>;
}

export interface EncoderImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

type MaskFn = (x: number) => number;

// import lazily/on-demand using webpack
async function importEncoderByEnv(typ: EncoderType) {
  switch (typ) {
    case EncoderType.jpegjsEncoder:
      return await import(/* webpackPrefetch: true */"./jpegjs-encoder");
    case EncoderType.wasmEncoder:
      return await import("./wasm-encoder");
    default:
      throw new Error(`Unknown encoder: ${typ}`);
  }
}

export class JpegEncoder extends JpegChannel {
  private encoderType: EncoderType;
  private n_channels: number = 1;
  private cachedMaskPhotoComponents = new Map();
  private maskPhotoFilePath: string;
  private sharpFn: any;

  constructor(usedBits: UsedBits, encoderType = EncoderType.jpegjsEncoder) {
    super(usedBits);
    this.encoderType = encoderType;
    console.log("Use encoder:", this.encoderType);
  }

  cacluateSquareImageWidth(byteLength: number) {
    assert(byteLength > 0, "byteLength should be greater than 0");
    // Bilibili demands image width larger than 10.
    const min_width = 10;
    return Math.max(
      Math.ceil(Math.sqrt(Math.ceil(byteLength / this.n_channels))),
      min_width
    );
  }

  setMaskPhotoFilePath(maskPhotoFilePath: string) {
    this.maskPhotoFilePath = maskPhotoFilePath;
  }

  debugPrint(byte: any) {
    const s = "00000000" + byte.toString(2);
    console.log(s.substr(-8, 8));
  }

  generateTargetImageData(width: number, arr: Uint8Array, nextPhotoMaskByteFn: MaskFn | null = null) {
    // I don't know why jpegjs can't work with 3 channels...
    const channels = this.encoderType === EncoderType.jpegjsEncoder ? 4 : 3;
    const targetImageData = new Uint8ClampedArray(width * width * channels);

    let counter = 0;
    // TODO: use other 2 components except chroma
    arr.forEach((nextByte) => {
      // Fill the setted mask image's chroma component byte's most significant bits 
      // to output image's most significant bits.
      if (nextPhotoMaskByteFn) {
        assert(this.usedBits.from >= 2,
          "When using photo mask, usedBits' from bit index should be greater than 1.")
        const photoMask = nextPhotoMaskByteFn(width);
        const usedMask = keepMostSignificantNBits(photoMask, this.usedBits.from - 1);
        nextByte |= usedMask;
      }
      targetImageData[counter++] = nextByte; // r
      if (this.n_channels === 1) {
        targetImageData[counter++] = nextByte; // g
        targetImageData[counter++] = nextByte; // b
        if (this.encoderType === EncoderType.jpegjsEncoder) {
          targetImageData[counter++] = 255;    // a
        }
      } else if (this.n_channels === 3) {
        if (((counter + 1) % 4 === 0) && this.encoderType === EncoderType.jpegjsEncoder) {
          targetImageData[counter++] = 255;    // a
        }
      }
    });
    return {
      width: width,
      height: width,
      data: targetImageData
    }
  }

  async getCachedMaskPhotoComponents(maskPhotoFilePath: string, width: number) {
    const key = `${maskPhotoFilePath}-${width}`;
    if (this.cachedMaskPhotoComponents.has(key)) {
      return this.cachedMaskPhotoComponents.get(key);
    }
    if (!this.sharpFn) {
      this.sharpFn = await import("sharp");
    }
    // @ts-ignore
    const maskPhotoBuf = await this.sharpFn(maskPhotoFilePath).resize(width, width)
      .jpeg({ mozjpeg: true })
      .toBuffer();
    // .toFile('/tmp/hehe.mask.jpg', (err, info) => { console.log(err, info) });

    // @ts-ignore
    const { components } = jpegjs.getImageComponents(maskPhotoBuf.buffer);
    // mask photo's height & width should be larger than outputWidth
    assert(components[0].lines.length >= width && components[0].lines[0].length >= width);

    this.cachedMaskPhotoComponents.set(key, components);
    return components;
  }

  async caculateMaskPhoto(maskPhotoFilePath: string, width: number) {
    if (!maskPhotoFilePath) {
      return;
    }
    const components = await this.getCachedMaskPhotoComponents(maskPhotoFilePath, width);

    let i = 0, j = 0;
    const maskFn = (outputWidth: number) => {
      if (j >= outputWidth) {
        i += 1;
        j = 0;
      }
      return components[0].lines[i][j++];
    };
    return maskFn;
  }

  async Write(ab: ArrayBuffer) {
    assert(ab.byteLength > 0, "input image data should not be empty");
    const serialized = serialize(new Uint8Array(ab), this.usedBits);
    const width = this.cacluateSquareImageWidth(serialized.byteLength);
    console.log("target image width: ", width);

    const nextPhotoMaskByteFn = await this.caculateMaskPhoto(this.maskPhotoFilePath, width);
    const targetImageData = this.generateTargetImageData(width, serialized, nextPhotoMaskByteFn);

    const encoder = await importEncoderByEnv(this.encoderType);
    const imageQuality = 100; // highest quality
    return await encoder.encodeImageData(targetImageData, imageQuality);
  }
}
