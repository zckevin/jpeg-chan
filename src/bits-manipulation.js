"use strict"

import { assert } from "./assert.js";

export class Byte {
  constructor(b, n) {
    assert(
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

  // drain from most significant bit to least significant bit
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
    assert(this.leftn <= 8, "Byte normalize() error: leftn > 8.");
    const result = (this.byte << (8 - this.leftn)) | mask;
    // this.leftn = 8;
    return result & 255;
  }

  static concat(head, tail) {
    assert(
      head.length + tail.length <= 8,
      "Byte Concat() error: head.length + tail.length > 8."
    );
    const lshiftN = tail.length;
    const b = (head.byte << lshiftN) | tail.byte;
    return new Byte(b, head.length + tail.length);
  }
}

/**
 * @param {Uint8Array} arr source data
 * @param {Number} unusedBitsN N least significant bits in the iterated byte are unused
 * @param {Number} mask mask to the N lsb bits
 * @returns {Function}
 */
export function serializeTo(arr, unusedBitsN, mask) {
  assert(unusedBitsN > 0 && unusedBitsN <= 8, "Invalid unusedBitsN.");
  let lastRoundByte = new Byte(0, 0);
  let arrayIndex = 0;
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
      if (arrayIndex < arr.length) {
        let nextBufferByte = new Byte(arr[arrayIndex++], 8);
        result = Byte.concat(
          result,
          nextBufferByte.drain(needBitsN - result.length)
        );
        lastRoundByte = nextBufferByte;
      } else {
        if (result.length > 0) {
          return result.normalize(mask);
        } else {
          return null;
        }
      }
    }
  };
}

/**
 * @param {Uint8ClampedArray} arr
 * @param {Number} usedBitsN
 * @param {Number} totalBytes
 * @returns {Iterable}
 */
export function parseFrom(arr, usedBitsN, totalBytes) {
  assert(usedBitsN > 0 && usedBitsN <= 8, "Invalid usedBitsN.");
  let lastRoundByte = new Byte(0, 0);
  let counter = 0;
  let arrayIndex = 0;

  function next() {
    let result = new Byte(0, 0);
    while (true) {
      // always drained enough demanded bytes from buffer, finish
      if (counter >= totalBytes) {
        return {done: true, value: 0};
      }
      // already drained all 8 bits of a byte, return it
      if (result.length == 8) {
        counter += 1;
        return {done: false, value: result.normalize()};
      }
      // concat bits from last round byte
      if (!lastRoundByte.empty) {
        result = Byte.concat(result, lastRoundByte.drain(8 - result.length));
        continue;
      }
      // if has more bytes to drain
      if (arrayIndex < arr.length) {
        let nextBufferByte = new Byte(arr[arrayIndex++], 8).drain(usedBitsN);
        result = Byte.concat(result, nextBufferByte.drain(8 - result.length));
        lastRoundByte = nextBufferByte;
      } else {
        if (result.length > 0 && counter < totalBytes) {
          counter += 1;
          return {done: false, value: result.normalize()};
        } else {
          return {done: true, value: 0};
        }
      }
    }
  };

  const iter = { next };
  return iter;
}
