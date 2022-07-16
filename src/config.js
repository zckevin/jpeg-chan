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

class ConfigBase {
  /**
   * @param {UsedBits} usedBits 
   * @param {CipherConfig} cipherConfig 
   * @param {Number} concurrency 
   */
  constructor(usedBits, cipherConfig, concurrency,) {
    assert(concurrency > 0, `Concurrency should be integer above 0 instead of ${concurrency}`);
    this.usedBits = usedBits;
    this.cipherConfig = cipherConfig;
    this.concurrency = concurrency;
  }
}

export class SinkUploadConfig extends ConfigBase {
  /**
   * @param {UsedBits} usedBits 
   * @param {CipherConfig} cipherConfig 
   * @param {Number} concurrency 
   * @param {boolean} validate 
   * @param {string} maskPhotoFilePath 
   * @param {symbol} encoder
   * @param {Number} sinkType
   */
  constructor(usedBits, cipherConfig, concurrency, validate, maskPhotoFilePath, encoder, sinkType) {
    super(usedBits, cipherConfig, concurrency);
    this.validate = validate;
    this.maskPhotoFilePath = maskPhotoFilePath;
    this.encoder = encoder;
    this.sinkType = sinkType;
  }
}

export class SinkDownloadConfig extends ConfigBase {
  /**
   * @param {UsedBits} usedBits 
   * @param {CipherConfig} cipherConfig 
   * @param {Number} concurrency 
   * @param {symbol} decoder 
   */
  constructor(usedBits, cipherConfig, concurrency, decoder) {
    super(usedBits, cipherConfig, concurrency);
    this.decoder = decoder;
  }

  cloneWithNewUsedBits(usedBits) {
    return new SinkDownloadConfig(usedBits, this.cipherConfig, this.concurrency, this.decoder);
  }
}