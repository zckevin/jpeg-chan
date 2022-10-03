import { UsedBits } from '../bits-manipulation';
import { DecoderType } from '../common-types';
import { CipherConfig } from '../config';

export interface DecodeDecryptParams {
  ab: ArrayBuffer,
  read_n: number,
  usedBits: UsedBits,
  decoderType: DecoderType,
  cipherConfig: CipherConfig,
  dryRun: boolean,
}