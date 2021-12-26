import { assert } from "./assert.js";

export class WeiboJpegChannel {
  /**
   * @param {Number} usedBitsN, how many significant side bits are used as data in a byte(8 bits)
   */
  constructor(usedBitsN) {
    assert(usedBitsN <= 8 && usedBitsN >= 1, "usedBitsN should be between 1 and 8");
    if (usedBitsN > 6) {
      console.warn(`Set usedBitsN > 6 is not gonna work in most situations.`)
    }
    this.usedBitsN = usedBitsN;
    this.mask = WeiboJpegChannel.getMask(usedBitsN);
  }

  // mask try to make USED BITS surrive from JPEG's lossy compression,
  // so we make it half of the **UNUSED** bits value, e.g.
  // | 1 1 1 x x x x x | usedBits   := 3
  // | 1 1 1 0 1 1 1 1 | mask value := (1 << (8-3-1)) - 1
  // | 1 1 1 0 1 1 1 1 | final byte
  static getMask(usedBitsN) {
    if (usedBitsN > 6) {
      return 0;
    }
    const unusedBitsN = 8 - usedBitsN;
    return (1 << (unusedBitsN - 1)) - 1;
  }
}