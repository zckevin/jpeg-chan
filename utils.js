function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function getUntilNull(next) {
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

function drainN(nextByteFn, n) {
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
    if (counter > 10000) {
      console.trace();
      assert.strictEqual(false, true, "getUntilNull: found dead loop.");
    }
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

function debugPrint(arr, format) {
  if (!format) {
    format = convert.dec2bin;
  }
  let s = [];
  arr.map((b) => {
    s.push(format(b));
  });
  console.log(s.join(" "));
}

module.exports = {
  getRandomInt,
  getUntilNull,
  debugPrint,
  convert,
  drainN,
};
