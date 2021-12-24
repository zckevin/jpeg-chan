"use strict"

import { assert } from "./assert.js";

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

  keepLowerNBits(n) {
    const mask = (1 << n) - 1;
    this.value = this.value & mask;
  }

  drain(drainedN) {
    if (drainedN > this.nbits) {
      return new ExtByte(0, 0);
    }
    const cursor = new ExtByte((this.value >> (this.nbits - drainedN)), drainedN);
    this.keepLowerNBits(this.nbits - drainedN);
    this.nbits = this.nbits - drainedN;
    return cursor;
  }

  concat(other) {
    this.value = (this.value << other.nbits) | other.value;
    this.nbits = this.nbits + other.nbits;
  }

  shiftedValue(mask = 0) {
    // assert(this.leftn <= 8, "Byte normalize() error: leftn > 8.");
    assert(this.nbits <= 8);
    return ((this.value << (8 - this.nbits)) | mask) & 255;
  }

  realValue() {
    return this.value;
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

export function serialize(arr, usedBitsN, mask) {
  if (!mask) {
    mask = (1 << ((8 - usedBitsN) - 1)) - 1;
  }

  const bytesNeeded = Math.ceil(arr.length * 8 / usedBitsN);
  const result = new Uint8Array(bytesNeeded);
  let counter = 0;
  let cursor = new ExtByte(0, 0);
  for (let i = 0; i < arr.length; i++) {
    cursor.concat(new ExtByte(arr[i], 8));
    let drainedByte = cursor.drain(usedBitsN);
    while (!drainedByte.empty) {
      result[counter++] = drainedByte.shiftedValue(mask);
      drainedByte = cursor.drain(usedBitsN);
    }
  }
  // left bits
  if (!cursor.empty) {
    assert(cursor.length < usedBitsN);
    result[counter++] = cursor.shiftedValue(mask);
  }
  // TODO: needs a slice here? 
  // return result.slice(0, counter);
  return result;
}

export function deserialize(arr, usedBitsN, totalBytes) {
  assert(usedBitsN > 0 && usedBitsN <= 8, "Invalid usedBitsN.");

  const result = new Uint8Array(totalBytes);

  let counter = 0;
  let arrayIndex = 0;

  let cursor = new ExtByte(0, 0);
  while (true) {
    // drained enough demanded bytes from buffer, finish
    if (counter >= totalBytes) {
      return result;
    }
    // already drained all 8 bits of a byte, return it
    if (cursor.length >= 8) {
      result[counter++] = cursor.drain(8).realValue();
      continue;
    }
    // if has more bytes to drain
    if (arrayIndex < arr.length) {
      let nextBufferByte = new ExtByte(arr[arrayIndex++], 8).drain(usedBitsN);
      cursor.concat(nextBufferByte);
    } else {
      if (cursor.length > 0) {
        result[counter++] = cursor.realValue();
      }
      if (counter < totalBytes) {
        throw new Error("deserialize: short read.")
      }
    }
  }
}
