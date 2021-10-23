const assert = require("assert").strict;

class Byte {
  constructor(b, n) {
    assert.ok(
      b >= 0 && b < 256 && n >= 0 && n <= 8,
      `Invalid Byte() constructor arguments: (${b}, ${n})`
    );
    // raw data
    this.byte = b;
    // has n valid bits in this.byte
    this.leftn = n;
  }

  get length() {
    return this.leftn;
  }

  get empty() {
    return this.leftn <= 0;
  }

  // drain from most significant bit to least most significant bit
  //
  // | 1 1 0 0 0 1 0 1 |, leftn = 8
  //           -> drain(3)
  // | 0 0 0 1 1 0 0 0 |, leftn = 5
  //
  // return a new byte:
  // | 0 0 0 0 0 1 0 1 |, leftn = 3
  drain(n) {
    if (n < this.leftn) {
      const drained = this.byte >> (this.leftn - n);
      this.leftn -= n;
      this.byte = this.byte ^ (drained << this.leftn);
      return new Byte(drained, n);
    } else {
      const ret = new Byte(this.byte, this.leftn);
      this.leftn = 0;
      return ret;
    }
  }

  // turn this into a standard/normalized byte, which means leftn == 8
  normalize(mask = 0) {
    const result = (this.byte << (8 - this.leftn)) | mask;
    this.leftn = 8;
    return result;
  }

  static concat(head, tail) {
    assert.ok(
      head.length + tail.length <= 8,
      "Byte Concat() error: head.length + tail.length > 8."
    );
    const lshiftN = tail.length;
    const b = (head.byte << lshiftN) | tail.byte;
    return new Byte(b, head.length + tail.length);
  }
}

// @buf: Buffer, source data
// @unusedBitsN: Interger, N least significant bits in the iterated byte are unused
// @mask: byte, mask to the N lsb bits
function serializeFromBuffer(buf, unusedBitsN, mask) {
  let lastRoundByte = new Byte(0, 0);
  return function next() {
    let result = new Byte(0, 0);
    while (true) {
      const needBitsN = 8 - unusedBitsN;
      if (result.length == needBitsN) {
        return result.normalize(mask);
      }
      if (!lastRoundByte.empty) {
        result = Byte.concat(
          result,
          lastRoundByte.drain(needBitsN - result.length)
        );
        continue;
      }
      assert.ok(lastRoundByte.empty);
      if (buf.length == 0) {
        if (result.length > 0) {
          return result.normalize(mask);
        } else {
          // console.log("met buffer end.")
          return null;
        }
      }
      let nextBufferByte = new Byte(buf[0], 8);
      buf = buf.slice(1);
      result = Byte.concat(
        result,
        nextBufferByte.drain(needBitsN - result.length)
      );
      lastRoundByte = nextBufferByte;
    }
  };
}

function parseFromBuffer(buf, usedBitsN, totalBytes) {
  let lastRoundByte = new Byte(0, 0);
  let counter = 0;
  return function next() {
    let result = new Byte(0, 0);
    while (true) {
      if (result.length == 8) {
        counter += 1;
        return result.byte;
      }
      if (!lastRoundByte.empty) {
        result = Byte.concat(result, lastRoundByte.drain(8 - result.length));
        continue;
      }
      assert.ok(lastRoundByte.empty);
      if (buf.length == 0) {
        if (result.length > 0 && counter < totalBytes) {
          counter += 1;
          return result.normalize();
        } else {
          // console.log("met buffer end.")
          return null;
        }
      }
      let nextBufferByte = new Byte(buf[0], 8).drain(usedBitsN);
      buf = buf.slice(1);
      result = Byte.concat(result, nextBufferByte.drain(8 - result.length));
      lastRoundByte = nextBufferByte;
    }
  };
}

module.exports = {
  serializeFromBuffer,
  parseFromBuffer,
};
