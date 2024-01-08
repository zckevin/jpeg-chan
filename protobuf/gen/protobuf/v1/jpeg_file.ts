/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { messageTypeRegistry } from "../../typeRegistry";

export const protobufPackage = "protobuf.v1";

export interface PbResourceURL {
  $type: "protobuf.v1.PbResourceURL";
  urlOneof?: { $case: "url"; url: string } | { $case: "shortUrl"; shortUrl: PbResourceURL_ShortURL };
}

export interface PbResourceURL_ID {
  $type: "protobuf.v1.PbResourceURL.ID";
  id: Uint8Array;
  /** if `id` is a valid hex string */
  isHex: boolean;
}

export interface PbResourceURL_ShortURL {
  $type: "protobuf.v1.PbResourceURL.ShortURL";
  /**
   * image identifier for download from different sinks
   * e.g. https://i2.hdslb.com/bfs/archive/2e3b2831c37cfad73ea2885ce0110e08b159ed0f.jpg
   * id is 2e3b2831c37cfad73ea2885ce0110e08b159ed0f
   */
  id: PbResourceURL_ID | undefined;
  sinkType: number;
  /** sub version of the corespondent sink type */
  sinkTypeMinor: number;
}

export interface PbFilePointer {
  $type: "protobuf.v1.PbFilePointer";
  /** chunk size */
  size: number;
  usedBits: string;
  checksum: Uint8Array;
  resources: PbResourceURL[];
}

/** could be a linked list */
export interface PbIndexFile {
  $type: "protobuf.v1.PbIndexFile";
  ended: boolean;
  chunks: PbFilePointer[];
  /** next segment of the index file */
  next: PbFilePointer | undefined;
}

export interface PbBootloaderFile {
  $type: "protobuf.v1.PbBootloaderFile";
  indexFileHead: PbFilePointer | undefined;
  fileSize: number;
  chunkSize: number;
  fileName: string;
  /** key/iv pair for file chunks encryption */
  aesKey: Uint8Array;
  aesIv: Uint8Array;
  /** sha256 of the whole file */
  checksum: Uint8Array;
}

function createBasePbResourceURL(): PbResourceURL {
  return { $type: "protobuf.v1.PbResourceURL", urlOneof: undefined };
}

export const PbResourceURL = {
  $type: "protobuf.v1.PbResourceURL" as const,

  encode(message: PbResourceURL, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.urlOneof?.$case === "url") {
      writer.uint32(10).string(message.urlOneof.url);
    }
    if (message.urlOneof?.$case === "shortUrl") {
      PbResourceURL_ShortURL.encode(message.urlOneof.shortUrl, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbResourceURL {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbResourceURL();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.urlOneof = { $case: "url", url: reader.string() };
          break;
        case 2:
          message.urlOneof = { $case: "shortUrl", shortUrl: PbResourceURL_ShortURL.decode(reader, reader.uint32()) };
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbResourceURL {
    return {
      $type: PbResourceURL.$type,
      urlOneof: isSet(object.url)
        ? { $case: "url", url: String(object.url) }
        : isSet(object.shortUrl)
        ? { $case: "shortUrl", shortUrl: PbResourceURL_ShortURL.fromJSON(object.shortUrl) }
        : undefined,
    };
  },

  toJSON(message: PbResourceURL): unknown {
    const obj: any = {};
    message.urlOneof?.$case === "url" && (obj.url = message.urlOneof?.url);
    message.urlOneof?.$case === "shortUrl" &&
      (obj.shortUrl = message.urlOneof?.shortUrl
        ? PbResourceURL_ShortURL.toJSON(message.urlOneof?.shortUrl)
        : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbResourceURL>, I>>(object: I): PbResourceURL {
    const message = createBasePbResourceURL();
    if (object.urlOneof?.$case === "url" && object.urlOneof?.url !== undefined && object.urlOneof?.url !== null) {
      message.urlOneof = { $case: "url", url: object.urlOneof.url };
    }
    if (
      object.urlOneof?.$case === "shortUrl" &&
      object.urlOneof?.shortUrl !== undefined &&
      object.urlOneof?.shortUrl !== null
    ) {
      message.urlOneof = { $case: "shortUrl", shortUrl: PbResourceURL_ShortURL.fromPartial(object.urlOneof.shortUrl) };
    }
    return message;
  },
};

messageTypeRegistry.set(PbResourceURL.$type, PbResourceURL);

function createBasePbResourceURL_ID(): PbResourceURL_ID {
  return { $type: "protobuf.v1.PbResourceURL.ID", id: new Uint8Array(), isHex: false };
}

export const PbResourceURL_ID = {
  $type: "protobuf.v1.PbResourceURL.ID" as const,

  encode(message: PbResourceURL_ID, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id.length !== 0) {
      writer.uint32(10).bytes(message.id);
    }
    if (message.isHex === true) {
      writer.uint32(16).bool(message.isHex);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbResourceURL_ID {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbResourceURL_ID();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.bytes();
          break;
        case 2:
          message.isHex = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbResourceURL_ID {
    return {
      $type: PbResourceURL_ID.$type,
      id: isSet(object.id) ? bytesFromBase64(object.id) : new Uint8Array(),
      isHex: isSet(object.isHex) ? Boolean(object.isHex) : false,
    };
  },

  toJSON(message: PbResourceURL_ID): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = base64FromBytes(message.id !== undefined ? message.id : new Uint8Array()));
    message.isHex !== undefined && (obj.isHex = message.isHex);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbResourceURL_ID>, I>>(object: I): PbResourceURL_ID {
    const message = createBasePbResourceURL_ID();
    message.id = object.id ?? new Uint8Array();
    message.isHex = object.isHex ?? false;
    return message;
  },
};

messageTypeRegistry.set(PbResourceURL_ID.$type, PbResourceURL_ID);

function createBasePbResourceURL_ShortURL(): PbResourceURL_ShortURL {
  return { $type: "protobuf.v1.PbResourceURL.ShortURL", id: undefined, sinkType: 0, sinkTypeMinor: 0 };
}

export const PbResourceURL_ShortURL = {
  $type: "protobuf.v1.PbResourceURL.ShortURL" as const,

  encode(message: PbResourceURL_ShortURL, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== undefined) {
      PbResourceURL_ID.encode(message.id, writer.uint32(10).fork()).ldelim();
    }
    if (message.sinkType !== 0) {
      writer.uint32(16).uint32(message.sinkType);
    }
    if (message.sinkTypeMinor !== 0) {
      writer.uint32(24).uint32(message.sinkTypeMinor);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbResourceURL_ShortURL {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbResourceURL_ShortURL();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = PbResourceURL_ID.decode(reader, reader.uint32());
          break;
        case 2:
          message.sinkType = reader.uint32();
          break;
        case 3:
          message.sinkTypeMinor = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbResourceURL_ShortURL {
    return {
      $type: PbResourceURL_ShortURL.$type,
      id: isSet(object.id) ? PbResourceURL_ID.fromJSON(object.id) : undefined,
      sinkType: isSet(object.sinkType) ? Number(object.sinkType) : 0,
      sinkTypeMinor: isSet(object.sinkTypeMinor) ? Number(object.sinkTypeMinor) : 0,
    };
  },

  toJSON(message: PbResourceURL_ShortURL): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id ? PbResourceURL_ID.toJSON(message.id) : undefined);
    message.sinkType !== undefined && (obj.sinkType = Math.round(message.sinkType));
    message.sinkTypeMinor !== undefined && (obj.sinkTypeMinor = Math.round(message.sinkTypeMinor));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbResourceURL_ShortURL>, I>>(object: I): PbResourceURL_ShortURL {
    const message = createBasePbResourceURL_ShortURL();
    message.id = (object.id !== undefined && object.id !== null) ? PbResourceURL_ID.fromPartial(object.id) : undefined;
    message.sinkType = object.sinkType ?? 0;
    message.sinkTypeMinor = object.sinkTypeMinor ?? 0;
    return message;
  },
};

messageTypeRegistry.set(PbResourceURL_ShortURL.$type, PbResourceURL_ShortURL);

function createBasePbFilePointer(): PbFilePointer {
  return { $type: "protobuf.v1.PbFilePointer", size: 0, usedBits: "", checksum: new Uint8Array(), resources: [] };
}

export const PbFilePointer = {
  $type: "protobuf.v1.PbFilePointer" as const,

  encode(message: PbFilePointer, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.size !== 0) {
      writer.uint32(8).uint32(message.size);
    }
    if (message.usedBits !== "") {
      writer.uint32(18).string(message.usedBits);
    }
    if (message.checksum.length !== 0) {
      writer.uint32(26).bytes(message.checksum);
    }
    for (const v of message.resources) {
      PbResourceURL.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbFilePointer {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbFilePointer();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.size = reader.uint32();
          break;
        case 2:
          message.usedBits = reader.string();
          break;
        case 3:
          message.checksum = reader.bytes();
          break;
        case 4:
          message.resources.push(PbResourceURL.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbFilePointer {
    return {
      $type: PbFilePointer.$type,
      size: isSet(object.size) ? Number(object.size) : 0,
      usedBits: isSet(object.usedBits) ? String(object.usedBits) : "",
      checksum: isSet(object.checksum) ? bytesFromBase64(object.checksum) : new Uint8Array(),
      resources: Array.isArray(object?.resources) ? object.resources.map((e: any) => PbResourceURL.fromJSON(e)) : [],
    };
  },

  toJSON(message: PbFilePointer): unknown {
    const obj: any = {};
    message.size !== undefined && (obj.size = Math.round(message.size));
    message.usedBits !== undefined && (obj.usedBits = message.usedBits);
    message.checksum !== undefined &&
      (obj.checksum = base64FromBytes(message.checksum !== undefined ? message.checksum : new Uint8Array()));
    if (message.resources) {
      obj.resources = message.resources.map((e) => e ? PbResourceURL.toJSON(e) : undefined);
    } else {
      obj.resources = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbFilePointer>, I>>(object: I): PbFilePointer {
    const message = createBasePbFilePointer();
    message.size = object.size ?? 0;
    message.usedBits = object.usedBits ?? "";
    message.checksum = object.checksum ?? new Uint8Array();
    message.resources = object.resources?.map((e) => PbResourceURL.fromPartial(e)) || [];
    return message;
  },
};

messageTypeRegistry.set(PbFilePointer.$type, PbFilePointer);

function createBasePbIndexFile(): PbIndexFile {
  return { $type: "protobuf.v1.PbIndexFile", ended: false, chunks: [], next: undefined };
}

export const PbIndexFile = {
  $type: "protobuf.v1.PbIndexFile" as const,

  encode(message: PbIndexFile, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.ended === true) {
      writer.uint32(8).bool(message.ended);
    }
    for (const v of message.chunks) {
      PbFilePointer.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.next !== undefined) {
      PbFilePointer.encode(message.next, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbIndexFile {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbIndexFile();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ended = reader.bool();
          break;
        case 2:
          message.chunks.push(PbFilePointer.decode(reader, reader.uint32()));
          break;
        case 3:
          message.next = PbFilePointer.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbIndexFile {
    return {
      $type: PbIndexFile.$type,
      ended: isSet(object.ended) ? Boolean(object.ended) : false,
      chunks: Array.isArray(object?.chunks) ? object.chunks.map((e: any) => PbFilePointer.fromJSON(e)) : [],
      next: isSet(object.next) ? PbFilePointer.fromJSON(object.next) : undefined,
    };
  },

  toJSON(message: PbIndexFile): unknown {
    const obj: any = {};
    message.ended !== undefined && (obj.ended = message.ended);
    if (message.chunks) {
      obj.chunks = message.chunks.map((e) => e ? PbFilePointer.toJSON(e) : undefined);
    } else {
      obj.chunks = [];
    }
    message.next !== undefined && (obj.next = message.next ? PbFilePointer.toJSON(message.next) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbIndexFile>, I>>(object: I): PbIndexFile {
    const message = createBasePbIndexFile();
    message.ended = object.ended ?? false;
    message.chunks = object.chunks?.map((e) => PbFilePointer.fromPartial(e)) || [];
    message.next = (object.next !== undefined && object.next !== null)
      ? PbFilePointer.fromPartial(object.next)
      : undefined;
    return message;
  },
};

messageTypeRegistry.set(PbIndexFile.$type, PbIndexFile);

function createBasePbBootloaderFile(): PbBootloaderFile {
  return {
    $type: "protobuf.v1.PbBootloaderFile",
    indexFileHead: undefined,
    fileSize: 0,
    chunkSize: 0,
    fileName: "",
    aesKey: new Uint8Array(),
    aesIv: new Uint8Array(),
    checksum: new Uint8Array(),
  };
}

export const PbBootloaderFile = {
  $type: "protobuf.v1.PbBootloaderFile" as const,

  encode(message: PbBootloaderFile, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.indexFileHead !== undefined) {
      PbFilePointer.encode(message.indexFileHead, writer.uint32(10).fork()).ldelim();
    }
    if (message.fileSize !== 0) {
      writer.uint32(16).uint32(message.fileSize);
    }
    if (message.chunkSize !== 0) {
      writer.uint32(24).uint32(message.chunkSize);
    }
    if (message.fileName !== "") {
      writer.uint32(34).string(message.fileName);
    }
    if (message.aesKey.length !== 0) {
      writer.uint32(42).bytes(message.aesKey);
    }
    if (message.aesIv.length !== 0) {
      writer.uint32(50).bytes(message.aesIv);
    }
    if (message.checksum.length !== 0) {
      writer.uint32(58).bytes(message.checksum);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbBootloaderFile {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbBootloaderFile();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.indexFileHead = PbFilePointer.decode(reader, reader.uint32());
          break;
        case 2:
          message.fileSize = reader.uint32();
          break;
        case 3:
          message.chunkSize = reader.uint32();
          break;
        case 4:
          message.fileName = reader.string();
          break;
        case 5:
          message.aesKey = reader.bytes();
          break;
        case 6:
          message.aesIv = reader.bytes();
          break;
        case 7:
          message.checksum = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbBootloaderFile {
    return {
      $type: PbBootloaderFile.$type,
      indexFileHead: isSet(object.indexFileHead) ? PbFilePointer.fromJSON(object.indexFileHead) : undefined,
      fileSize: isSet(object.fileSize) ? Number(object.fileSize) : 0,
      chunkSize: isSet(object.chunkSize) ? Number(object.chunkSize) : 0,
      fileName: isSet(object.fileName) ? String(object.fileName) : "",
      aesKey: isSet(object.aesKey) ? bytesFromBase64(object.aesKey) : new Uint8Array(),
      aesIv: isSet(object.aesIv) ? bytesFromBase64(object.aesIv) : new Uint8Array(),
      checksum: isSet(object.checksum) ? bytesFromBase64(object.checksum) : new Uint8Array(),
    };
  },

  toJSON(message: PbBootloaderFile): unknown {
    const obj: any = {};
    message.indexFileHead !== undefined &&
      (obj.indexFileHead = message.indexFileHead ? PbFilePointer.toJSON(message.indexFileHead) : undefined);
    message.fileSize !== undefined && (obj.fileSize = Math.round(message.fileSize));
    message.chunkSize !== undefined && (obj.chunkSize = Math.round(message.chunkSize));
    message.fileName !== undefined && (obj.fileName = message.fileName);
    message.aesKey !== undefined &&
      (obj.aesKey = base64FromBytes(message.aesKey !== undefined ? message.aesKey : new Uint8Array()));
    message.aesIv !== undefined &&
      (obj.aesIv = base64FromBytes(message.aesIv !== undefined ? message.aesIv : new Uint8Array()));
    message.checksum !== undefined &&
      (obj.checksum = base64FromBytes(message.checksum !== undefined ? message.checksum : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbBootloaderFile>, I>>(object: I): PbBootloaderFile {
    const message = createBasePbBootloaderFile();
    message.indexFileHead = (object.indexFileHead !== undefined && object.indexFileHead !== null)
      ? PbFilePointer.fromPartial(object.indexFileHead)
      : undefined;
    message.fileSize = object.fileSize ?? 0;
    message.chunkSize = object.chunkSize ?? 0;
    message.fileName = object.fileName ?? "";
    message.aesKey = object.aesKey ?? new Uint8Array();
    message.aesIv = object.aesIv ?? new Uint8Array();
    message.checksum = object.checksum ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(PbBootloaderFile.$type, PbBootloaderFile);

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var globalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

function bytesFromBase64(b64: string): Uint8Array {
  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(""));
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends { $case: string } ? { [K in keyof Omit<T, "$case">]?: DeepPartial<T[K]> } & { $case: T["$case"] }
  : T extends {} ? { [K in Exclude<keyof T, "$type">]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P> | "$type">]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
