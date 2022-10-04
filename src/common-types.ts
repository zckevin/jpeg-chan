export enum SinkType {
  unknown = 0,
  memfile,
  tmpfile,
  weibo,
  bilibili,
}

export enum DecoderType {
  browserDecoder = 1,
  jpegjsDecoder,
  wasmDecoder,
}

export enum EncoderType {
  jpegjsEncoder = 1,
  wasmEncoder,
}