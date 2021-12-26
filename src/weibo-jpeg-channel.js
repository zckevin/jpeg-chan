import { assert, assertNotReached } from "./assert.js";
import { UsedBits } from "./bits-manipulation.js"

export class WeiboJpegChannel {
  constructor(usedBits) {
    if (typeof usedBits == "number") {
      assert(usedBits <= 8 && usedBits >= 1, "usedBitsN should be between 1 and 8");
      if (usedBits > 6) {
        console.warn(`Set usedBitsN > 6 is not gonna work in most situations.`)
      }
      this.mask = WeiboJpegChannel.getMask(usedBits);
      this.usedBits = new UsedBits(1, usedBits);
    } else if (usedBits instanceof UsedBits) {
      this.usedBits = usedBits;
    } else {
      assertNotReached();
    }
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