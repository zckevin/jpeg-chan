# jpeg-chan
[![Tests](https://github.com/zckevin/weibo-jpeg-channel/actions/workflows/testing.yml/badge.svg)](https://github.com/zckevin/weibo-jpeg-channel/actions/workflows/testing.yml)

将任意数据分块并加密后储存于 jpeg 图像的空间域中, 并上传至各大社交平台.

## 原理

假定图像通道深度为 8-bit, e.g:

|high <--> low|

| 1 2 3 4  5 6 7 8 |

一个字节按照 [1-8] 从高位到低, [6-8] bits 因各大社交平台普遍对 jpeg 图片进行二次处理, 其值易发生变化, 因此将 payload 数据储存于 [1-5] bits 之间.

e.g. 上传 128KiB 数据至 Bilibili, used bits 为 [1-5], chunk size 设定为 128KiB(即分块数目为1):

```
node bin/cmd.js test -s bili -b 1-5 128k 128k
```

将生成两张图片, 一张为 Bootloader, 一张为实际文件内容(具体信息参考下一节: 文件格式):

bootloader:

![bootloader](/docs/128KiB_bootloader.jpg)

payload:

![payload](/docs/128KiB.jpg)

同时支持使用另一个图片作为 mask, 例如使用如下文件作为 mask, 上传 128KiB 数据至 Bilibili, used bits 为 [2-5]:

![mask](/image_templates/mask_400px.jpg)

```
node bin/cmd.js test -s bili -b 2-5 128k 128k
```

payload:

![payload](/docs/128KiB_masked_2_5.jpg)

修改 used bits 为: [4-5], 可以看到使用空间域的低位将减少图片的噪点(尽管对于深度学习识别系统而言没什么实际作用):

```
node bin/cmd.js test -s bili -b 4-5 128k 128k
```

payload:

![payload](/docs/128KiB_masked_4_5.jpg)


## 文件格式

目标存储文件根据用户提供的 chunk size 切分为 N 个 chunks, 每个 chunk 上传为一张 JPEG 图片. 每张 jpeg 图片对应着一个 `FilePointer`, 其中包含这个 chunk 的 meta data, 以及该图片的网络 url.

- FilePointer
  - chunk size
  - used bits
  - checksum
  - urls

Chunks pointers 和目标存储文件的其它 meta data 储存在 `BootloadFile` 中, 它也将上传为一张 JPEG 图片.

- Bootloader
  - array of chunk pointers
  - file size
  - chunk size
  - file name
  - aes_key
  - aes_iv
  - sha256 checksum

最后根据 `BootloaderFile` 上传后得到的 `FilePointer`, 经由 base64url 编码生成一串如下格式的 URI: 

> jpegchan://CNABEgMxLTUaIBpV77TOwCh3hCedDr-n_Szv3_F-gkWeoNNXRkwTK7yIIjMSMQorCikwNDU0YTBkZTZjM2M5Nzc1MjEwZDVkZmE5MzI3ZDQxNTY5MDMwMjY1OBAEGAE?password=6060ba5bee6848c3

password 存储在 URL 的 query 中, 用户在公开分享该 url 时可以将其隐藏并通过其它信道分享 password.

## Usage

具体参数参考 `bin/cmd.js`

### 上传文件

```
node bin/cmd.js upload -s bili ./package.json 90
```

### 下载文件

文件将保存于`/tmp`目录下.

```
node bin/cmd.js download \
  "jpegchan://CNABEgMxLTUaIBpV77TOwCh3hCedDr-n_Szv3_F-gkWeoNNXRkwTK7yIIjMSMQorCikwNDU0YTBkZTZjM2M5Nzc1MjEwZDVkZmE5MzI3ZDQxNTY5MDMwMjY1OBAEGAE?password=6060ba5bee6848c3"
```

## Todos

- 支持多平台冗余上传
- 通过兼容 BitTorrent 支持 FUSEfs

## Dev

### debug log

Run `cmd.js` with `DEBUG=*`

### update protocol/protobuf

- npm run build:pb

### run tests

- jest: encoder/decoder tests on Node.js
- karma: encoder/decoder tests on browser

### inspect decoder perf in chrome

1. write test in //tests/e2e/
2. run `npm run e2e` to start chrome and karma server
3. open performance tab in Devtools and start recording
4. run `npx karma run -- --grep KEYWORD` to run the specific test

## 免责声明

[免责声明](/docs/免责声明.md)

本项目开发仅作为科研学习使用, 请勿将本项目用作以下用途, 如若违反本软件作者概不负责，亦不承担任何法律责任.

- 软件病毒 payload 下发, 回传 C2 服务器
- 盗版网站 host 视频数据
- ...