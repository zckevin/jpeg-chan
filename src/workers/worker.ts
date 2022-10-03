import { DecodeBuffer } from '../jpeg-decoder';
import { DecryptBuffer } from "../encryption"
import { UsedBits } from '../bits-manipulation';
import { DecodeDecryptParams } from "./params"
import { randomString, WrapFunctionWithTimePerf } from '../utils';
import debug from 'debug';

const workerID = randomString();
const log = debug(`jpeg:worker:${workerID}`);

export default async function DecodeDecrypt(params: DecodeDecryptParams) {
  const { ab, read_n, usedBits, decoderType, cipherConfig, dryRun } = params;
  if (dryRun) {
    return params;
  }
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