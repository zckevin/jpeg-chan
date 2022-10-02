import { EncoderType, JpegEncoder } from "./jpeg-encoder/index";
import { DecoderType, JpegDecoder } from "./jpeg-decoder/index";
import { SinkDownloadConfig, SinkUploadConfig } from "./config";
import { UsedBits } from './bits-manipulation';
import { AES_GCM_AUTH_TAG_LENGTH } from "./encryption"

const cachedEncoders: Map<string, JpegEncoder> = new Map();
const cachedDecoders: Map<string, JpegDecoder> = new Map();

function getEncoder(usedBits: UsedBits, encoderType: EncoderType) {
  let enc: JpegEncoder;
  const key = `${usedBits}-${encoderType.toString()}`;
  if (cachedEncoders.has(key)) {
    enc = cachedEncoders.get(key)!;
  } else {
    enc = new JpegEncoder(usedBits, encoderType);
    cachedEncoders.set(key, enc);
  }
  return enc;
}

function getDecoder(usedBits: UsedBits, decoderType: DecoderType) {
  let dec: JpegDecoder;
  const key = `${usedBits}-${decoderType.toString()}`;
  if (cachedDecoders.has(key)) {
    dec = cachedDecoders.get(key)!;
  } else {
    dec = new JpegDecoder(usedBits, decoderType);
    cachedDecoders.set(key, dec);
  }
  return dec;
}

export async function DecodeBuffer(ab: ArrayBuffer, read_n: number, usedBits: UsedBits, decoderType: DecoderType) {
  const dec = getDecoder(usedBits, decoderType);
  return await dec.Read(ab, read_n + AES_GCM_AUTH_TAG_LENGTH);
}

export async function EncodeBuffer(ab: ArrayBuffer, usedBits: UsedBits, config: SinkUploadConfig) {
  const enc = getEncoder(
    config.usedBits,
    config.encoderType || EncoderType.jpegjsEncoder,
  );
  console.log("config", config)
  if (config.maskPhotoFilePath) {
    enc.setMaskPhotoFilePath(config.maskPhotoFilePath);
  }
  return await enc.Write(ab);
}