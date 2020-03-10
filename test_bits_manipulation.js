const bits = require("./bits_manipulation");
const assert = require('assert').strict;
const utils = require("./utils");

function concatBufToString(buf) {
    return buf.reduce((acc, b) => acc += utils.convert.dec2bin(b), "")
}

function binStringToBuf(s) {
    let arr = [];
    while(s.length > 0) {
        arr.push(utils.convert.bin2dec(s.substring(0, 8)))
        s = s.substring(8)
    }
    return Buffer.from(arr)
}

function drainFromBuffer(buf, n, mask) {
    let s = concatBufToString(buf)
    let smask = utils.convert.hex2bin(mask, 8-n)
    return () => {
        while (s.length > 0) {
            let drained = s.substring(0, n);
            s = s.substring(drained.length)
            if (drained.length < n) {
                drained = drained.padEnd(n, "0")
            }
            let result = utils.convert.bin2dec(drained + smask)
            assert.strictEqual(result <= 255 && result >= 0, true)
            return result;
        }
        return null;
    }
}

function getFromBuffer(buf, n, totalBytes) {
    let s = concatBufToString(buf)
    let counter = 0

    let s2 = ""
    while (s.length > 0) {
        s2 += s.substring(0, n)
        s = s.substring(8)
    }
    let arr = []
    while (s2.length > 0) {
        arr.push(utils.convert.bin2dec(s2.substring(0, 8)))
        // s2 = s2.substring(8).padEnd(8, "0")
        s2 = s2.substring(8)
    }
    return () => {
        if (counter >= arr.length || counter >= totalBytes) {
            return null
        }
        let result = arr[counter]
        counter += 1
        return result;
    }
}

function test_stringBufferConvert() {
    let buf = Buffer.from(Array(10).fill().map(_ => utils.getRandomInt(255)))
    assert.deepStrictEqual(buf, binStringToBuf(concatBufToString(buf)))
}

function test_drainAndGet(INTERATE_TIMES) {
    Array(INTERATE_TIMES).fill().map(_ => {
        let N = utils.getRandomInt(500) + 100
        let buf = Buffer.from(Array(N).fill().map(_ => utils.getRandomInt(255)))
        let N_BITS = utils.getRandomInt(7) + 1
        console.log(N, N_BITS)

        let next = drainFromBuffer(buf, N_BITS, 0)
        let sentBytes = utils.getUntilNull(next)

        let next2 = getFromBuffer(Buffer.from(sentBytes), N_BITS, N)
        let recvedBytes = utils.getUntilNull(next2)

        // debugPrint(buf)
        // debugPrint(sentBytes)
        // debugPrint(recvedBytes)
        assert.deepStrictEqual(buf, Buffer.from(recvedBytes))
    })
}

function test_bitsImplementation(INTERATE_TIMES) {
    Array(INTERATE_TIMES).fill().map(_ => {
        let N = utils.getRandomInt(500) + 100
        let buf = Buffer.from(Array(N).fill().map(_ => utils.getRandomInt(255)))
        let N_BITS = utils.getRandomInt(7) + 1
        console.log(N, N_BITS)

        let next = drainFromBuffer(buf, N_BITS, 0)
        let sentBytes = utils.getUntilNull(next)

        let next2 = bits.getFromBuffer(Buffer.from(sentBytes), N_BITS, N)
        let recvedBytes = utils.getUntilNull(next2)

        // debugPrint(buf)
        // debugPrint(sentBytes)
        // debugPrint(recvedBytes)
        assert.deepStrictEqual(buf, Buffer.from(recvedBytes))
    })
}

function test_bitsImplementation_reverse(INTERATE_TIMES) {
    Array(INTERATE_TIMES).fill().map(_ => {
        let N = utils.getRandomInt(500) + 100
        let buf = Buffer.from(Array(N).fill().map(_ => utils.getRandomInt(255)))
        let N_BITS = utils.getRandomInt(7) + 1
        console.log(N, N_BITS)

        let next = bits.drainFromBuffer(buf, N_BITS, 0)
        let sentBytes = utils.getUntilNull(next)

        let next2 = getFromBuffer(Buffer.from(sentBytes), N_BITS, N)
        let recvedBytes = utils.getUntilNull(next2)

        // debugPrint(buf)
        // debugPrint(sentBytes)
        // debugPrint(recvedBytes)
        assert.deepStrictEqual(buf, Buffer.from(recvedBytes))
    })
}

test_stringBufferConvert()
test_drainAndGet(100)
test_bitsImplementation(100)
test_bitsImplementation_reverse(100)
