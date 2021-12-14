export class WeiboJpegChannel {
  /**
   * @param {Number} usedBitsN, how many significant side bits are used as data in a byte(8 bits)
   */
  constructor(usedBitsN) {
    this.usedBitsN = usedBitsN;
    this.unusedBitsN = 8 - usedBitsN;

    // mask try to make byte value suffer from JPEG DCT
    // so we make it half to the *unused* bits value, e.g.
    // | 1 0 0 1 x x x x |, usedBits = 4
    // | 0 0 0 0 0 1 1 1 | <- mask value := (1<<3)-1
    // | 1 0 0 1 0 1 1 1 |, final byte
    this.mask = (1 << (this.unusedBitsN - 1)) - 1;
  }
}