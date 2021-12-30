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

// https://stackoverflow.com/a/14697130/671376
export function RGB2Y(r, g, b) {
  return ((19595 * r + 38470 * g + 7471 * b ) >> 16);
}