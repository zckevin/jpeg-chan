export function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

export function randomString(length = 8) {
  // return Array(n).fill().map(_ => String.fromCharCode(33 + Math.random() * (127 - 33))).join('');
  let result = "", seeds

  for(let i = 0; i < length - 1; i++){
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

export function randomBytesArray(n) {
  let arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = getRandomInt(256);
  }
  return arr;
}

export function getUntilNull(next) {
  let arr = [];
  let counter = 0;
  while (true) {
    let val = next();
    if (val == null) break;
    arr.push(val);
    counter += 1;
    if (counter > 10000) {
      console.trace();
      assert.strictEqual(false, true, "getUntilNull: found dead loop.");
    }
  }
  return arr;
}

export function drainN(nextByteFn, n) {
  const result = [];
  let counter = 0;
  while (true) {
    if (counter >= n) {
      break;
    }
    const byte = nextByteFn();
    if (byte == null) break;
    result.push(byte);
    counter += 1;
  }
  return result;
}

/**
 * @param {Iterator} iter 
 * @param {Number} n 
 * @returns {Uint8ClampedArray}
 */
export function drainNBytes(iter, n) {
  // TODO: assert(n > 0);
  const result = new Uint8ClampedArray(n);
  let counter = 0;

  let item = iter.next();
  while (!item.done && counter < n) {
    result[counter++] = item.value;
    item = iter.next();
  }

  if (counter < n) {
    throw new Error("short read");
  }
  return result;
}

const convert = {
  bin2dec: (s) => {
    assert.strictEqual(
      s.length > 0 && s.length <= 8,
      true,
      "binary string's length should be in 0-8 range."
    );
    return parseInt(s, 2).toString(10);
  },
  dec2bin: (d) => {
    assert.strictEqual(
      d >= 0 && d <= 255,
      true,
      "digit should be in 0-255 range"
    );
    return parseInt(d, 10).toString(2).padStart(8, "0");
  },
  hex2bin: (h, n) => parseInt(h, 16).toString(2).padStart(n, "0"),
  dec2hex: (s) => parseInt(s, 10).toString(16),
};

export function debugPrint(arr, format) {
  if (!format) {
    format = convert.dec2bin;
  }
  let s = [];
  arr.map((b) => {
    s.push(format(b));
  });
  console.log(s.join(" "));
}
