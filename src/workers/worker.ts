import { DecodeBuffer } from '../encoder-decoder';
import { SinkDownloadConfig } from "../config";
import { DecryptBuffer } from "../encryption"
import { UsedBits } from '../bits-manipulation';

interface DecodeDecryptParams {
  ab: ArrayBuffer,
  read_n: number,
  usedBits: UsedBits,
  config: SinkDownloadConfig,
  dryRun: boolean,
}

export default async function DecodeDecrypt(params: DecodeDecryptParams) {
  const { ab, read_n, usedBits, config, dryRun } = params;
  if (dryRun) {
    return {
      ab, usedBits, config,
    };
  }
  const decoded = await DecodeBuffer(ab, read_n, UsedBits.fromObject(usedBits), config);
  return DecryptBuffer(Buffer.from(decoded), config.cipherConfig);
}