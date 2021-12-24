import { ExtByte, serialize, deserialize } from '../../src/bits-manipulation.js';
import { randomBytesArray } from "../../src/utils.js";

test("ExtByte.prototype.drain()", () => {
  function testDrainByte(byte, drainN, expectedValue) {
    const originalBinaryArray = byte.binaryArray();

    const drained = byte.drain(drainN);
    expect(drained.length).toEqual(drainN);
    expect(drained.binaryArray()).toEqual(originalBinaryArray.slice(0, drainN));
    expect(byte.binaryArray()).toEqual(originalBinaryArray.slice(drainN));
  }

  {
    const byte = new ExtByte(0x0, 8);
    expect(byte.length).toEqual(8);
    testDrainByte(new ExtByte(0x0, 0), 0, 0x0);
    testDrainByte(new ExtByte(0x0, 8), 5, 0x0);
  }
  {
    testDrainByte(new ExtByte(0xff, 8), 8, 0xff);
    testDrainByte(new ExtByte(0xff, 8), 7, 0x7f);
    testDrainByte(new ExtByte(0xff, 8), 1, 0x01);
    testDrainByte(new ExtByte(0xff, 8), 0, 0x00);
  }
});

test("ExtByte.prototype.concat()", () => {
  function testConcat(head, tail, expectedNewByteBinaryArray) {
    head.concat(tail);
    expect(head.binaryArray()).toEqual(expectedNewByteBinaryArray);
  }

  testConcat(new ExtByte(0x0, 1), new ExtByte(0x0, 1), [0, 0]);
  testConcat(new ExtByte(0x1, 1), new ExtByte(0x1, 1), [1, 1]);
  testConcat(new ExtByte(0x1, 4), new ExtByte(0x0, 4), [0, 0, 0, 1, 0, 0, 0, 0]);
  testConcat(new ExtByte(0x0, 4), new ExtByte(0x0, 5), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  testConcat(new ExtByte(0x80, 8), new ExtByte(0x1, 1), [1, 0, 0, 0, 0, 0, 0, 0, 1]);
  testConcat(new ExtByte(0x1, 1), new ExtByte(0x80, 8), [1, 1, 0, 0, 0, 0, 0, 0, 0]);
  testConcat(new ExtByte(0xff, 8), new ExtByte(0xff, 8), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
});


test("serialize/deserialize", () => {
  const arr = new Uint8Array([1, 2, 3, 4]);
  const tmp = serialize(arr, 4);

  const deserialized = deserialize(tmp, 4, arr.length);
  expect(deserialized).toEqual(arr);
})