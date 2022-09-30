import { deserialize, UsedBits } from "../bits-manipulation";
import { JpegChannel } from "../channels/jpeg-channel";
import { isBrowser } from "browser-or-node";
import { assert } from "../assert";

export enum DecoderType {
  browserDecoder = 1,
  jpegjsDecoder,
  wasmDecoder,
}

export interface Decoder {
  getJpegChromaComponent: (ab: ArrayBuffer) => Promise<Uint8ClampedArray>;
}

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
    const chromaComponent = await this.decoder.getJpegChromaComponent(ab);
    return deserialize(chromaComponent, this.usedBits, n).buffer;
  }
}
