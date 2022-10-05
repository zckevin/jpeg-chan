import { UsedBits } from '../bits-manipulation';
import { EncoderType, DecoderType } from '../common-types';
import { CipherConfig } from '../config';

export interface DecodeDecryptParams {
  ab: ArrayBuffer,
  read_n: number,
  usedBits: UsedBits,
  decoderType: DecoderType,
  cipherConfig: CipherConfig,
  // dryRun: boolean,
}

export interface EncryptEncodeParams {
  ab: ArrayBuffer,
  minUploadBufferSize: number,
  encoderType: EncoderType,
  usedBits: UsedBits,
  cipherConfig: CipherConfig,
  maskPhotoFilePath: string,
}

export enum WorkerCmd {
  DecodeDecrypt = 1,
  EncryptEncode,
}

export interface WorkerParams {
  cmd: WorkerCmd,
  params: DecodeDecryptParams | EncryptEncodeParams,
}