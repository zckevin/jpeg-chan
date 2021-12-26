"use strict"

import { assert } from "./assert.js";

export function keepMostSignificantNBits(byte, n) {
  // assert(n >= 0 & n <= 8);
  return (byte >> (8 - n)) << (8 - n);
}

export function keepLeastSignificantNBits(byte, n) {
  // assert(n >= 0 & n <= 8);
  return byte & ((1 << n) - 1);
}

export class UsedBits {
  /**
   * | 1 2 3 4  5 6 7 8 |
   * @param {Number} from 
   * @param {Number} to inclusive
   */
  constructor(from, to) {
    assert(from >= 1 && to <= 8 && from <= to, `Invalid UsedBits value: ${from}-${to}`);
    this.from = from;
    this.to = to;
  }

  length() {
    return this.to - this.from + 1;
  }

  mask() {
    if (this.to > 6) {
      console.warn("WARN: set usedBitsN > 6 is not gonna work in most situations.")
      return 0;
    }
    const diff = 8 - (this.to + 1);
    return (1 << diff) - 1;
  }
}

// a bits container that have `this.nbits` bits stored inside
export class ExtByte {
  constructor(value, nbits) {
    this.value = value;
    this.nbits = nbits;
  }

  get length() {
    return this.nbits;
  }

  get empty() {
    return this.nbits === 0;
  }

  /**
   * @param {Number} n 
   * @returns 
   */
  drainN(n) {
    if (n > this.nbits) {
      return new ExtByte(0, 0);
    }
    const byte = new ExtByte((this.value >> (this.nbits - n)), n);
    this.value = keepLeastSignificantNBits(this.value, this.nbits - n);
    this.nbits = this.nbits - n;
    return byte;
  }

  concat(other) {
    this.value = (this.value << other.nbits) | other.value;
    this.nbits = this.nbits + other.nbits;
  }

  pick(usedBits) {
    const tmp1 = keepMostSignificantNBits(this.value, usedBits.to);
    const tmp2 = tmp1 >> (8 - usedBits.to);
    const tmp3 = keepLeastSignificantNBits(tmp2, usedBits.length());
    return new ExtByte(tmp3, usedBits.length());
  }

  normalize(usedBits) {
    const leftIndex = (8 - this.nbits) + 1;
    const diff = leftIndex - usedBits.from;
    return ((this.value << diff) | usedBits.mask()) & 255;
  }

  realValue() {
    return this.value;
  }

  // for debug
  static fromBinaryArray(binaryArray) {
    const v = parseInt(binaryArray.join(""), 2);
    return new ExtByte(v, binaryArray.length);
  }

  // for debug
  binaryArray() {
    const result = [];
    for (let i = 0; i < this.nbits; i++) {
      result.push((this.value >> (this.nbits - i - 1)) & 1);
    }
    return result;
  }
}

/**
 * @param {Uint8Array} arr 
 * @param {UsedBits} usedBits 
 * @returns {Uint8Array}
 */
export function serialize(arr, usedBits) {
  if (typeof usedBits === "number") {
    usedBits = new UsedBits(1, usedBits);
  }

  const bytesNeeded = Math.ceil(arr.length * 8 / usedBits.length());
  const result = new Uint8Array(bytesNeeded);

  let counter = 0;
  let cursor = new ExtByte(0, 0);
  for (let i = 0; i < arr.length; i++) {
    cursor.concat(new ExtByte(arr[i], 8));
    let drainedByte = cursor.drainN(usedBits.length());
    while (!drainedByte.empty) {
      result[counter++] = drainedByte.normalize(usedBits);
      drainedByte = cursor.drainN(usedBits.length());
    }
  }
  // left bits
  if (!cursor.empty) {
    assert(cursor.length < usedBits.length());
    result[counter++] = cursor.normalize(usedBits);
  }
  // TODO: needs a slice here? 
  // return result.slice(0, counter);
  return result;
}

/**
 * @param {Uint8Array} arr 
 * @param {UsedBits} usedBits 
 * @param {Number} bytesNeeded 
 * @returns {Uint8Array}
 */
export function deserialize(arr, usedBits, bytesNeeded) {
  if (typeof usedBits === "number") {
    usedBits = new UsedBits(1, usedBits);
  }

  const result = new Uint8Array(bytesNeeded);
  let counter = 0, arrayIndex = 0;
  let cursor = new ExtByte(0, 0);
  while (true) {
    // drained enough demanded bytes from buffer, finish
    if (counter >= bytesNeeded) {
      return result;
    }
    // already drained all 8 bits of a byte, return it
    if (cursor.length >= 8) {
      result[counter++] = cursor.drainN(8).realValue();
      continue;
    }
    // if has more bytes to drain
    if (arrayIndex < arr.length) {
      let nextBufferByte = new ExtByte(arr[arrayIndex++], 8).pick(usedBits);
      cursor.concat(nextBufferByte);
    } else {
      if (cursor.length > 0) {
        result[counter++] = cursor.realValue();
      }
      if (counter < bytesNeeded) {
        throw new Error("deserialize: short read.")
      }
    }
  }
}
