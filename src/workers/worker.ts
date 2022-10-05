import { EncodeBuffer } from '../jpeg-encoder';
import { DecodeBuffer } from '../jpeg-decoder';
import { EncryptBuffer, DecryptBuffer } from "../encryption"
import { UsedBits } from '../bits-manipulation';
import { EncryptEncodeParams, DecodeDecryptParams, WorkerParams, WorkerCmd } from "./params"
import { randomString, WrapFunctionWithTimePerf } from '../utils';
import debug from 'debug';

const workerID = randomString();
const log = debug(`jpeg:worker:${workerID}`);

async function DecodeDecrypt(params: DecodeDecryptParams) {
  const { ab, read_n, usedBits, decoderType, cipherConfig } = params;
  log(
    "DecodeDecrypt start: usedBits,ab_length,read_n",
    usedBits,
    ab.byteLength,
    read_n,
  );
  const decoded = await WrapFunctionWithTimePerf("DecodeBuffer", async () => {
    return await DecodeBuffer(ab, read_n, UsedBits.fromObject(usedBits), decoderType);
  }, log);
  return await WrapFunctionWithTimePerf("DecryptBuffer", async () => {
    return DecryptBuffer(Buffer.from(decoded), cipherConfig);
  }, log);
}

async function EncryptEncode(params: EncryptEncodeParams) {
  const { ab, minUploadBufferSize, encoderType, usedBits, cipherConfig, maskPhotoFilePath } = params;
  log(
    "EncryptEncode start: usedBits,ab_length,minUploadBufferSize,maskPhotoFilePath",
    usedBits,
    ab.byteLength,
    minUploadBufferSize,
    maskPhotoFilePath,
  )
  const encypted = await WrapFunctionWithTimePerf("EncryptBuffer", async () => {
    return EncryptBuffer(Buffer.from(ab), cipherConfig, minUploadBufferSize);
  }, log)
  return await WrapFunctionWithTimePerf("EncodeBuffer", async () => {
    const ab = await EncodeBuffer(encypted, UsedBits.fromObject(usedBits), encoderType, maskPhotoFilePath);
    return (ab as ArrayBuffer).slice(0, ab.byteLength);
  }, log);
}

export default async function run(workerParams: WorkerParams) {
  const { cmd, params } = workerParams;
  switch (cmd) {
    case WorkerCmd.DecodeDecrypt:
      return await DecodeDecrypt(params as DecodeDecryptParams);
    case WorkerCmd.EncryptEncode:
      return await EncryptEncode(params as EncryptEncodeParams);
    default:
      throw new Error(`unknown cmd: ${cmd}`);
  }
}