import { assert } from "./assert";

export function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max));
}

export function randomString(length = 8) {
  let result = "";
  let seeds: number[];

  for (let i = 0; i < length - 1; i++) {
    //Generate seeds array, that will be the bag from where randomly select generated char
    seeds = [
      Math.floor(Math.random() * 10) + 48,
      Math.floor(Math.random() * 25) + 65,
      Math.floor(Math.random() * 25) + 97
    ]

    //Choise randomly from seeds, convert to char and append to result
    result += String.fromCharCode(seeds[Math.floor(Math.random() * 3)])
  }

  return result
}

export function randomBytesArray(n: number) {
  let arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = getRandomInt(256);
  }
  return arr;
}

const convert = {
  bin2dec: (s: string) => {
    assert(
      s.length > 0 && s.length <= 8,
      "binary string's length should be in 0-8 range."
    );
    return parseInt(s, 2).toString(10);
  },
  dec2bin: (d: string) => {
    // assert(
    //   d >= 0 && d <= 255,
    //   "digit should be in 0-255 range"
    // );
    return parseInt(d, 10).toString(2).padStart(8, "0");
  },
  hex2bin: (h: string, n: number) => parseInt(h, 16).toString(2).padStart(n, "0"),
  dec2hex: (s: string) => parseInt(s, 10).toString(16),
};

export function debugPrint(arr: string[], format: (s: string) => string) {
  if (!format) {
    format = convert.dec2bin;
  }
  let s: string[] = [];
  arr.map((b) => {
    s.push(format(b));
  });
  console.log(s.join(" "));
}

// https://stackoverflow.com/a/14697130/671376
export function RGB2Y(r: number, g: number, b: number) {
  return ((19595 * r + 38470 * g + 7471 * b) >> 16);
}

export function BufferToArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}