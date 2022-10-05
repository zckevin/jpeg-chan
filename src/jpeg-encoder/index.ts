import { assert } from "../assert";
import { EncoderType } from "../common-types";
import { JpegChannel } from "../channels/jpeg-channel";
import { serialize, UsedBits, keepMostSignificantNBits } from "../bits-manipulation";
import debug from 'debug';

const log = debug('jpeg:encoder');

export interface Encoder {
  encodeImageData: (targetImageData: EncoderImageData, imageQuality: number) => Promise<Buffer>;
}

export interface EncoderImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

type MaskFn = (x: number) => number;

const cachedEncoders: Map<string, JpegEncoder> = new Map();

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
  private cachedMaskPhotoComponents = new Map<string, any>();
  private maskPhotoFilePath: string;
  private jimpMod: any;

  constructor(usedBits: UsedBits, encoderType = EncoderType.jpegjsEncoder) {
    super(usedBits);
    this.encoderType = encoderType;
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
    if (!this.jimpMod) {
      this.jimpMod = (await import("jimp")).default;
    }
    const Jimp = this.jimpMod;
    const key = `${maskPhotoFilePath}-${width}`;
    if (this.cachedMaskPhotoComponents.has(key)) {
      return this.cachedMaskPhotoComponents.get(key);
    }

    const image = await Jimp.read(maskPhotoFilePath);
    image.resize(width, Jimp.AUTO);

    this.cachedMaskPhotoComponents.set(key, image);
    return image;
  }

  async caculateMaskPhoto(maskPhotoFilePath: string, width: number) {
    if (!maskPhotoFilePath) {
      return;
    }
    const cachedImage = await this.getCachedMaskPhotoComponents(maskPhotoFilePath, width);

    let i = 0, j = 0;
    const maskFn = (outputWidth: number) => {
      if (j >= outputWidth) {
        i += 1;
        j = 0;
      }
      // weird order...
      return this.jimpMod.intToRGBA(cachedImage.getPixelColor(j++, i)).r;
    };
    return maskFn;
  }

  async Write(ab: ArrayBuffer) {
    if (ab.byteLength == 0) {
      return ab;
    }
    const serialized = serialize(new Uint8Array(ab), this.usedBits);
    const width = this.cacluateSquareImageWidth(serialized.byteLength);
    log("target image width:", width);

    const nextPhotoMaskByteFn = await this.caculateMaskPhoto(this.maskPhotoFilePath, width);
    const targetImageData = this.generateTargetImageData(width, serialized, nextPhotoMaskByteFn);

    const encoder = await importEncoderByEnv(this.encoderType);
    const imageQuality = 100; // highest quality
    return await encoder.encodeImageData(targetImageData, imageQuality);
  }
}

function getEncoder(usedBits: UsedBits, encoderType: EncoderType) {
  let enc: JpegEncoder;
  const key = `${usedBits}-${encoderType.toString()}`;
  if (cachedEncoders.has(key)) {
    enc = cachedEncoders.get(key)!;
  } else {
    enc = new JpegEncoder(usedBits, encoderType);
    cachedEncoders.set(key, enc);
  }
  log("EncodeBuffer with decoder:", EncoderType[encoderType]);
  return enc;
}

export async function EncodeBuffer(ab: ArrayBuffer, usedBits: UsedBits, encoderType: EncoderType, maskPhotoFilePath: string) {
  const enc = getEncoder(usedBits, encoderType);
  if (maskPhotoFilePath) {
    enc.setMaskPhotoFilePath(maskPhotoFilePath);
  }
  return await enc.Write(ab);
}