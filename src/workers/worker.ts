import { DecodeBuffer } from '../jpeg-decoder';
import { DecryptBuffer } from "../encryption"
import { UsedBits } from '../bits-manipulation';
import { DecodeDecryptParams } from "./params"

export default async function DecodeDecrypt(params: DecodeDecryptParams) {
  const { ab, read_n, usedBits, decoderType, cipherConfig, dryRun } = params;
  if (dryRun) {
    return params;
  }
  const decoded = await DecodeBuffer(ab, read_n, UsedBits.fromObject(usedBits), decoderType);
  return DecryptBuffer(Buffer.from(decoded), cipherConfig);
}