const assert = require('assert').strict;

class Byte {
    constructor(b, n) {
        this.b = b
        this.leftn = n
    }

    get length() {
        return this.leftn
    }

    get empty() {
        return this.leftn <= 0
    }

    drain(n) {
       if (n < this.leftn) {
            let drained = this.b >> (this.leftn - n)
            this.leftn -= n
           this.b = this.b ^ (drained << this.leftn)
           return new Byte(drained, n)
       } else {
           let ret = new Byte(this.b, this.leftn)
           this.leftn = 0
           return ret
       }
    }

    static concat(head, tail) {
        if (head.length + tail.length > 8) {
            console.log("Concat error: head.length + tail.length > 8.")
            return null
        }
        let leftShift = tail.length
        let b = head.b << leftShift | tail.b
        return new Byte(b, head.length + tail.length)
    }
}


function drainFromBuffer(buf, n, mask) {
    let left = new Byte(0, 0)
    return function next() {
        let result = new Byte(0, 0)
        while (true) {
            if (result.length == n) {
                return (result.b << (8 - n)) | mask
            }
            if (!left.empty) {
                result = Byte.concat(result, left.drain(n - result.length))
                continue
            }
            assert.strictEqual(left.empty, true)
            if (buf.length == 0) {
                if (result.length > 0) {
                    return (result.b << (8 - result.length)) | mask
                } else {
                    // console.log("met buffer end.")
                    return null
                }
            }
            let newByte = new Byte(buf[0], 8)
            buf = buf.subarray(1)
            result = Byte.concat(result, newByte.drain(n - result.length))
            left = newByte
        }
    }
}

function getFromBuffer(buf, n, totalBytes) {
    let left = new Byte(0, 0)
    let counter = 0;
    return function next() {
        let result = new Byte(0, 0)
        while (true) {
            if (result.length == 8) {
                counter += 1
                return result.b
            }
            if (!left.empty) {
                result = Byte.concat(result, left.drain(8 - result.length))
                continue
            }

            assert.strictEqual(left.empty, true)
            if (buf.length == 0) {
                if (result.length > 0 && counter < totalBytes) {
                    counter += 1
                    return result.b << (8 - result.length)
                } else {
                    // console.log("met buffer end.")
                    return null
                }
            }
            // dicard trailing (8-n)bits mask
            let newByte = new Byte(buf[0], 8).drain(n)
            buf = buf.subarray(1)
            result = Byte.concat(result, newByte.drain(8 - result.length))
            left = newByte
        }
    }
}

module.exports = {
    drainFromBuffer,
    getFromBuffer,
}

