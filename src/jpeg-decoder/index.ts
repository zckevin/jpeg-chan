import { assert } from "../assert";
import { DecoderType } from "../common-types";
import { deserialize, UsedBits } from "../bits-manipulation";
import { JpegChannel } from "../channels/jpeg-channel";
import { isBrowser } from "browser-or-node";
import { AES_GCM_AUTH_TAG_LENGTH } from "../encryption"
import debug from 'debug';

const log = debug('jpeg:decoder');

export interface Decoder {
  getJpegChromaComponent: (ab: ArrayBuffer) => Promise<Uint8ClampedArray>;
}

const cachedDecoders: Map<string, JpegDecoder> = new Map();

// import lazily/on-demand using webpack
async function importDecoderByEnv(decoderType: DecoderType): Promise<Decoder> {
  switch (decoderType) {
    case DecoderType.browserDecoder:
      return await import(/* webpackPrefetch: true */"./browser-decoder");
    case DecoderType.jpegjsDecoder:
      return await import("./jpegjs-decoder");
    case DecoderType.wasmDecoder:
      return await import("./wasm-decoder");
    default:
      throw new Error(`Unknown decoder: ${decoderType}`);
  }
}

export class JpegDecoder extends JpegChannel {
  private decoder: Decoder;
  private decoderType: DecoderType;

  constructor(usedBits: UsedBits, decoderOrType: Decoder | DecoderType) {
    super(usedBits);

    if (decoderOrType) {
      if (typeof decoderOrType === "number") {
        this.decoderType = decoderOrType as DecoderType;
      } else {
        this.decoder = decoderOrType as Decoder;
        assert("getJpegChromaComponent" in this.decoder);
      }
    } else {
      this.decoderType = isBrowser ?
        DecoderType.browserDecoder : DecoderType.jpegjsDecoder;
    }
  }

  async Read(ab: ArrayBuffer, n: number) {
    if (!this.decoder) {
      this.decoder = await importDecoderByEnv(this.decoderType);
    }
    if (n <= 0) {
      return new Uint8Array(0).buffer;
    }
    const chromaComponent = await this.decoder.getJpegChromaComponent(ab);
    return deserialize(chromaComponent, this.usedBits, n).buffer;
  }
}

function getDecoder(usedBits: UsedBits, decoderType: DecoderType) {
  let dec: JpegDecoder;
  const key = `${usedBits}-${decoderType.toString()}`;
  if (cachedDecoders.has(key)) {
    dec = cachedDecoders.get(key)!;
  } else {
    dec = new JpegDecoder(usedBits, decoderType);
    cachedDecoders.set(key, dec);
  }
  log("DecodeBuffer with decoder:", DecoderType[decoderType]);
  return dec;
}

export async function DecodeBuffer(ab: ArrayBuffer, read_n: number, usedBits: UsedBits, decoderType: DecoderType) {
  const dec = getDecoder(usedBits, decoderType);
  const result = await dec.Read(ab, read_n + AES_GCM_AUTH_TAG_LENGTH);
  return result;
}