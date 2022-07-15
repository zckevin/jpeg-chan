import { assert } from "./assert.js";
import { UsedBits } from "./bits-manipulation.js";

export class CipherConfig {
  /**
   * @param {string} algorithm 
   * @param {Buffer} key 
   * @param {Buffer} iv 
   */
  constructor(algorithm, key, iv) {
    assert(algorithm === "aes-128-gcm");
    this.algorithm = algorithm;
    this.key = key;
    this.iv = iv;
  }
}

export class SinkUploadConfig {
  /**
   * @param {UsedBits} usedBits 
   * @param {CipherConfig} cipherConfig 
   * @param {boolean} validate 
   * @param {string} maskPhotoFilePath 
   * @param {symbol} encoder
   * @param {Number} sinkType
   */
  constructor(usedBits, cipherConfig, validate, maskPhotoFilePath, encoder, sinkType) {
    this.usedBits = usedBits;
    this.cipherConfig = cipherConfig;
    this.validate = validate;
    this.maskPhotoFilePath = maskPhotoFilePath;
    this.encoder = encoder;
    this.sinkType = sinkType;
  }
}

export class SinkDownloadConfig {
  /**
   * @param {UsedBits} usedBits 
   * @param {CipherConfig} cipherConfig 
   * @param {symbol} decoder 
   */
  constructor(usedBits, cipherConfig, decoder) {
    this.usedBits = usedBits;
    this.cipherConfig = cipherConfig;
    this.decoder = decoder;
  }

  cloneWithNewUsedBits(usedBits) {
    return new SinkDownloadConfig(usedBits, this.cipherConfig, this.decoder);
  }
}