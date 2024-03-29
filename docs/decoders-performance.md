## Running platform

- Browser: Chrome 95.0.4638.69 (Linux x86_64)
- CPU: Ryzen 3900x
- GPU: Nvidia GeForce GTX 950 2GB (browser may use GPU to do image decoding)

| payload size | usedBits | browserDecoder |  wasmDecoder |
| --- | --- | --- | --- |
| 64  | 1-2 | 43ms |  11ms |
| 64  | 1-3 | 21ms |  8ms |
| 64  | 1-4 | 14ms |  6ms |
| 64  | 1-5 | 13ms |  6ms |
| 64  | 1-6 | 16ms |  6ms |
| 512  | 1-2 | 24ms |  12ms |
| 512  | 1-3 | 22ms |  8ms |
| 512  | 1-4 | 11ms |  6ms |
| 512  | 1-5 | 16ms |  7ms |
| 512  | 1-6 | 17ms |  5ms |
| 1,024  | 1-2 | 9ms |  3ms |
| 1,024  | 1-3 | 18ms |  6ms |
| 1,024  | 1-4 | 12ms |  5ms |
| 1,024  | 1-5 | 18ms |  6ms |
| 1,024  | 1-6 | 11ms |  7ms |
| 10,240  | 1-2 | 25ms |  3ms |
| 10,240  | 1-3 | 17ms |  2ms |
| 10,240  | 1-4 | 21ms |  2ms |
| 10,240  | 1-5 | 22ms |  2ms |
| 10,240  | 1-6 | 7ms |  2ms |
| 131,072  | 1-2 | 39ms |  29ms |
| 131,072  | 1-3 | 25ms |  20ms |
| 131,072  | 1-4 | 20ms |  16ms |
| 131,072  | 1-5 | 15ms |  14ms |
| 131,072  | 1-6 | 17ms |  12ms |
| 524,288  | 1-2 | 127ms |  112ms |
| 524,288  | 1-3 | 98ms |  71ms |
| 524,288  | 1-4 | 52ms |  56ms |
| 524,288  | 1-5 | 52ms |  46ms |
| 524,288  | 1-6 | 41ms |  39ms |
| 1,048,576  | 1-2 | 214ms |  211ms |
| 1,048,576  | 1-3 | 149ms |  147ms |
| 1,048,576  | 1-4 | 116ms |  115ms |
| 1,048,576  | 1-5 | 99ms |  92ms |
| 1,048,576  | 1-6 | 94ms |  79ms |
| 2,097,152  | 1-2 | 439ms |  439ms |
| 2,097,152  | 1-3 | 291ms |  297ms |
| 2,097,152  | 1-4 | 212ms |  218ms |
| 2,097,152  | 1-5 | 191ms |  187ms |
| 2,097,152  | 1-6 | 161ms |  154ms |
| 5,242,880  | 1-2 | 987ms |  1043ms |
| 5,242,880  | 1-3 | 780ms |  733ms |
| 5,242,880  | 1-4 | 525ms |  553ms |
| 5,242,880  | 1-5 | 443ms |  451ms |
| 5,242,880  | 1-6 | 343ms |  379ms |
| 10,485,760  | 1-2 | 2221ms |  2160ms |
| 10,485,760  | 1-3 | 1242ms |  1431ms |
| 10,485,760  | 1-4 | 1196ms |  1107ms |
| 10,485,760  | 1-5 | 899ms |  896ms |
| 10,485,760  | 1-6 | 739ms |  769ms |