/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { messageTypeRegistry } from "../../typeRegistry";

export const protobufPackage = "protobuf.v1";

export interface PbFileChunk {
  $type: "protobuf.v1.PbFileChunk";
  size: number;
  url: string;
  usedBits: string;
}

/** linked list */
export interface PbIndexFile {
  $type: "protobuf.v1.PbIndexFile";
  ended: boolean;
  chunks: PbFileChunk[];
  next: PbFileChunk | undefined;
}

export interface PbBootloaderFile {
  $type: "protobuf.v1.PbBootloaderFile";
  fileSize: number;
  chunkSize: number;
  fileName: string;
  aesKey: Uint8Array;
  aesIv: Uint8Array;
  indexFileHead: PbFileChunk | undefined;
}

export interface PbBootloaderDescription {
  $type: "protobuf.v1.PbBootloaderDescription";
  id: string;
  sinkType: number;
  size: number;
  usedBits: string;
  password: Uint8Array;
}

function createBasePbFileChunk(): PbFileChunk {
  return { $type: "protobuf.v1.PbFileChunk", size: 0, url: "", usedBits: "" };
}

export const PbFileChunk = {
  $type: "protobuf.v1.PbFileChunk" as const,

  encode(message: PbFileChunk, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.size !== 0) {
      writer.uint32(8).uint32(message.size);
    }
    if (message.url !== "") {
      writer.uint32(18).string(message.url);
    }
    if (message.usedBits !== "") {
      writer.uint32(26).string(message.usedBits);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbFileChunk {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbFileChunk();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.size = reader.uint32();
          break;
        case 2:
          message.url = reader.string();
          break;
        case 3:
          message.usedBits = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbFileChunk {
    return {
      $type: PbFileChunk.$type,
      size: isSet(object.size) ? Number(object.size) : 0,
      url: isSet(object.url) ? String(object.url) : "",
      usedBits: isSet(object.usedBits) ? String(object.usedBits) : "",
    };
  },

  toJSON(message: PbFileChunk): unknown {
    const obj: any = {};
    message.size !== undefined && (obj.size = Math.round(message.size));
    message.url !== undefined && (obj.url = message.url);
    message.usedBits !== undefined && (obj.usedBits = message.usedBits);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbFileChunk>, I>>(object: I): PbFileChunk {
    const message = createBasePbFileChunk();
    message.size = object.size ?? 0;
    message.url = object.url ?? "";
    message.usedBits = object.usedBits ?? "";
    return message;
  },
};

messageTypeRegistry.set(PbFileChunk.$type, PbFileChunk);

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
      PbFileChunk.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.next !== undefined) {
      PbFileChunk.encode(message.next, writer.uint32(18).fork()).ldelim();
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
        case 3:
          message.chunks.push(PbFileChunk.decode(reader, reader.uint32()));
          break;
        case 2:
          message.next = PbFileChunk.decode(reader, reader.uint32());
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
      chunks: Array.isArray(object?.chunks) ? object.chunks.map((e: any) => PbFileChunk.fromJSON(e)) : [],
      next: isSet(object.next) ? PbFileChunk.fromJSON(object.next) : undefined,
    };
  },

  toJSON(message: PbIndexFile): unknown {
    const obj: any = {};
    message.ended !== undefined && (obj.ended = message.ended);
    if (message.chunks) {
      obj.chunks = message.chunks.map((e) => e ? PbFileChunk.toJSON(e) : undefined);
    } else {
      obj.chunks = [];
    }
    message.next !== undefined && (obj.next = message.next ? PbFileChunk.toJSON(message.next) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbIndexFile>, I>>(object: I): PbIndexFile {
    const message = createBasePbIndexFile();
    message.ended = object.ended ?? false;
    message.chunks = object.chunks?.map((e) => PbFileChunk.fromPartial(e)) || [];
    message.next = (object.next !== undefined && object.next !== null)
      ? PbFileChunk.fromPartial(object.next)
      : undefined;
    return message;
  },
};

messageTypeRegistry.set(PbIndexFile.$type, PbIndexFile);

function createBasePbBootloaderFile(): PbBootloaderFile {
  return {
    $type: "protobuf.v1.PbBootloaderFile",
    fileSize: 0,
    chunkSize: 0,
    fileName: "",
    aesKey: new Uint8Array(),
    aesIv: new Uint8Array(),
    indexFileHead: undefined,
  };
}

export const PbBootloaderFile = {
  $type: "protobuf.v1.PbBootloaderFile" as const,

  encode(message: PbBootloaderFile, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fileSize !== 0) {
      writer.uint32(8).uint32(message.fileSize);
    }
    if (message.chunkSize !== 0) {
      writer.uint32(16).uint32(message.chunkSize);
    }
    if (message.fileName !== "") {
      writer.uint32(26).string(message.fileName);
    }
    if (message.aesKey.length !== 0) {
      writer.uint32(34).bytes(message.aesKey);
    }
    if (message.aesIv.length !== 0) {
      writer.uint32(42).bytes(message.aesIv);
    }
    if (message.indexFileHead !== undefined) {
      PbFileChunk.encode(message.indexFileHead, writer.uint32(50).fork()).ldelim();
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
          message.fileSize = reader.uint32();
          break;
        case 2:
          message.chunkSize = reader.uint32();
          break;
        case 3:
          message.fileName = reader.string();
          break;
        case 4:
          message.aesKey = reader.bytes();
          break;
        case 5:
          message.aesIv = reader.bytes();
          break;
        case 6:
          message.indexFileHead = PbFileChunk.decode(reader, reader.uint32());
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
      fileSize: isSet(object.fileSize) ? Number(object.fileSize) : 0,
      chunkSize: isSet(object.chunkSize) ? Number(object.chunkSize) : 0,
      fileName: isSet(object.fileName) ? String(object.fileName) : "",
      aesKey: isSet(object.aesKey) ? bytesFromBase64(object.aesKey) : new Uint8Array(),
      aesIv: isSet(object.aesIv) ? bytesFromBase64(object.aesIv) : new Uint8Array(),
      indexFileHead: isSet(object.indexFileHead) ? PbFileChunk.fromJSON(object.indexFileHead) : undefined,
    };
  },

  toJSON(message: PbBootloaderFile): unknown {
    const obj: any = {};
    message.fileSize !== undefined && (obj.fileSize = Math.round(message.fileSize));
    message.chunkSize !== undefined && (obj.chunkSize = Math.round(message.chunkSize));
    message.fileName !== undefined && (obj.fileName = message.fileName);
    message.aesKey !== undefined &&
      (obj.aesKey = base64FromBytes(message.aesKey !== undefined ? message.aesKey : new Uint8Array()));
    message.aesIv !== undefined &&
      (obj.aesIv = base64FromBytes(message.aesIv !== undefined ? message.aesIv : new Uint8Array()));
    message.indexFileHead !== undefined &&
      (obj.indexFileHead = message.indexFileHead ? PbFileChunk.toJSON(message.indexFileHead) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbBootloaderFile>, I>>(object: I): PbBootloaderFile {
    const message = createBasePbBootloaderFile();
    message.fileSize = object.fileSize ?? 0;
    message.chunkSize = object.chunkSize ?? 0;
    message.fileName = object.fileName ?? "";
    message.aesKey = object.aesKey ?? new Uint8Array();
    message.aesIv = object.aesIv ?? new Uint8Array();
    message.indexFileHead = (object.indexFileHead !== undefined && object.indexFileHead !== null)
      ? PbFileChunk.fromPartial(object.indexFileHead)
      : undefined;
    return message;
  },
};

messageTypeRegistry.set(PbBootloaderFile.$type, PbBootloaderFile);

function createBasePbBootloaderDescription(): PbBootloaderDescription {
  return {
    $type: "protobuf.v1.PbBootloaderDescription",
    id: "",
    sinkType: 0,
    size: 0,
    usedBits: "",
    password: new Uint8Array(),
  };
}

export const PbBootloaderDescription = {
  $type: "protobuf.v1.PbBootloaderDescription" as const,

  encode(message: PbBootloaderDescription, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.sinkType !== 0) {
      writer.uint32(16).uint32(message.sinkType);
    }
    if (message.size !== 0) {
      writer.uint32(24).uint32(message.size);
    }
    if (message.usedBits !== "") {
      writer.uint32(34).string(message.usedBits);
    }
    if (message.password.length !== 0) {
      writer.uint32(42).bytes(message.password);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbBootloaderDescription {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbBootloaderDescription();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        case 2:
          message.sinkType = reader.uint32();
          break;
        case 3:
          message.size = reader.uint32();
          break;
        case 4:
          message.usedBits = reader.string();
          break;
        case 5:
          message.password = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbBootloaderDescription {
    return {
      $type: PbBootloaderDescription.$type,
      id: isSet(object.id) ? String(object.id) : "",
      sinkType: isSet(object.sinkType) ? Number(object.sinkType) : 0,
      size: isSet(object.size) ? Number(object.size) : 0,
      usedBits: isSet(object.usedBits) ? String(object.usedBits) : "",
      password: isSet(object.password) ? bytesFromBase64(object.password) : new Uint8Array(),
    };
  },

  toJSON(message: PbBootloaderDescription): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.sinkType !== undefined && (obj.sinkType = Math.round(message.sinkType));
    message.size !== undefined && (obj.size = Math.round(message.size));
    message.usedBits !== undefined && (obj.usedBits = message.usedBits);
    message.password !== undefined &&
      (obj.password = base64FromBytes(message.password !== undefined ? message.password : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbBootloaderDescription>, I>>(object: I): PbBootloaderDescription {
    const message = createBasePbBootloaderDescription();
    message.id = object.id ?? "";
    message.sinkType = object.sinkType ?? 0;
    message.size = object.size ?? 0;
    message.usedBits = object.usedBits ?? "";
    message.password = object.password ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(PbBootloaderDescription.$type, PbBootloaderDescription);

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
