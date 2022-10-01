import crypto from "crypto";
import { assert } from "./assert";
import { CipherConfig } from "./config";

const BOOTLOADER_SCRYPT_SALT = "tF%L6uPTJ5^hI%n63s0b";
export const AES_GCM_AUTH_TAG_LENGTH = 16;

function padBuffer(buf: Buffer, minUploadSize: number) {
  if (minUploadSize === 0 || buf.length >= minUploadSize) {
    return buf;
  }
  const result = Buffer.concat([
    buf, crypto.randomBytes(this.MIN_UPLOAD_BUFFER_SIZE - buf.length)
  ]);
  // console.log("padding", buf, result)
  return result;
}

export function EncryptBuffer(buf: Buffer, cipherConfig: CipherConfig, minUploadSize: number) {
  const cipher = crypto.createCipheriv(cipherConfig.algorithm, cipherConfig.key, cipherConfig.iv) as crypto.CipherGCM;
  const chunks: Buffer[] = [];
  chunks.push(cipher.update(buf));
  chunks.push(cipher.final());
  chunks.push(cipher.getAuthTag());
  return padBuffer(Buffer.concat(chunks), minUploadSize);
}

export function DecryptBuffer(buf: Buffer, cipherConfig: CipherConfig) {
  // Supports AES-128-GCM only
  assert(buf.length >= AES_GCM_AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(cipherConfig.algorithm, cipherConfig.key, cipherConfig.iv) as crypto.DecipherGCM;
  const chunks: Buffer[] = [];
  decipher.setAuthTag(buf.subarray(buf.length - AES_GCM_AUTH_TAG_LENGTH));
  chunks.push(decipher.update(buf.subarray(0, buf.length - AES_GCM_AUTH_TAG_LENGTH)));
  chunks.push(decipher.final());
  return Buffer.concat(chunks);
}

export function NewCipherConfigFromPassword(password: Uint8Array, keyLength: number = 28) {
  const scryptBuf = crypto.scryptSync(password, BOOTLOADER_SCRYPT_SALT, keyLength);
  return new CipherConfig("aes-128-gcm", scryptBuf.subarray(0, 16), scryptBuf.subarray(16, 28));
}
