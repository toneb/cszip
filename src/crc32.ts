// adapted from gist: https://gist.github.com/101arrowz/e58695f7ccfdf74f60ba22018093edea

/**!
 * Fast CRC32 in JavaScript
 * 101arrowz (https://github.com/101arrowz)
 * License: MIT
 */

// If you use this code, please link this gist or attribute it somehow.

// This code uses the Slice-by-16 algorithm to achieve performance
// roughly 2x greater than all other JS CRC32 implementations (e.g.
// crc32-js).

// Per local testing, Slice-by-16 outperforms Slice-by-4 by around 50%
// and Slice-by-8/Slice-by-32/Slice-by-64 by 10-30%

// This CRC implementation can compete with WASM CRC implementations
// as well, and it tends to perform between 30% faster and 10% slower
// than WASM CRC32 (>1MB input chunks is faster on WASM).

// The minified bundle size is under 1kB, about 700B gzipped.

// CRC32 table
// perf: signed integers are 2x more likely to be Smi
// Smi is a V8 datatype in (-2**30, 2**30-1)
// Smi operations are much faster
const crct = new Int32Array(4096);
for (let i = 0; i < 256; ++i) {
    let c = i, k = 9;
    while (--k) c = ((c & 1) && -306674912) ^ (c >>> 1);
    crct[i] = c;
}
for (let i = 0; i < 256; ++i) {
    let lv = crct[i];
    for (let j = 256; j < 4096; j += 256) lv = crct[i | j] = (lv >>> 8) ^ crct[lv & 255];
}

const crcts = [];

for (let i = 0; i < 16;) crcts[i] = crct.subarray(i << 8, ++i << 8);

const [
    t1, t2, t3, t4, t5, t6, t7, t8,
    t9, t10, t11, t12, t13, t14, t15, t16
] = crcts;

// raw CRC function
// stream by passing in previous CRC output as second parameter
export const rawCRC = (d: Uint8Array, c: number) => {
    // when second param not specified, defaults to ~0 = -1
    c = ~c;
    let i = 0;
    const max = d.length - 16;
    for (; i < max;) {
        c =
            t16[d[i++] ^ (c & 255)] ^
            t15[d[i++] ^ ((c >> 8) & 255)] ^
            t14[d[i++] ^ ((c >> 16) & 255)] ^
            t13[d[i++] ^ (c >>> 24)] ^
            t12[d[i++]] ^
            t11[d[i++]] ^
            t10[d[i++]] ^
            t9[d[i++]] ^
            t8[d[i++]] ^
            t7[d[i++]] ^
            t6[d[i++]] ^
            t5[d[i++]] ^
            t4[d[i++]] ^
            t3[d[i++]] ^
            t2[d[i++]] ^
            t1[d[i++]];
    }
    for (; i < d.length; ++i) c = t1[(c & 255) ^ d[i]] ^ (c >>> 8);
    return ~c;
}

// // Nicer API here
// // Remove this for smaller bundle
// class CRC {
//     /**
//      * Updates the CRC value by processing the buffer provided
//      * @param {Uint8Array} buf The buffer of data to process
//      * @returns {CRC} The current CRC
//      */
//     update(buf) {
//         if (!(buf instanceof Uint8Array)) {
//             throw new TypeError(
//                 'need a Uint8Array, not' +
//                 Object.prototype.toString.call(buf).slice(8, -1)
//             );
//         }
//         this.value = rawCRC(buf, this.value);
//         return this;
//     }
//     /**
//      * Returns the current value of the CRC
//      * @param {('hex'|'raw')} type The method with which to digest, default hex
//      * @returns The CRC value as hex or binary
//      */
//     digest(type) {
//         const value = this.value < 0
//             ? 0x1_0000_0000 + this.value
//             : this.value;
//         if (type == 'raw') {
//             return value;
//         } else if (type == 'hex' || type == undefined) {
//             return value.toString(16);
//         } else {
//             throw new TypeError(`cannot digest in form ${type}`)
//         }
//     }
// }

// License: MIT (use freely, but please attribute/link this gist)