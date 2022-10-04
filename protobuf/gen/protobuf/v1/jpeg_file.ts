/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { messageTypeRegistry } from "../../typeRegistry";

export const protobufPackage = "protobuf.v1";

export interface PbFilePointer {
  $type: "protobuf.v1.PbFilePointer";
  size: number;
  url: string;
  usedBits: string;
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
  fileSize: number;
  chunkSize: number;
  fileName: string;
  aesKey: Uint8Array;
  aesIv: Uint8Array;
  indexFileHead: PbFilePointer | undefined;
}

export interface PbBootloaderDescription {
  $type: "protobuf.v1.PbBootloaderDescription";
  desc: PbBootloaderShortDescription | undefined;
  password: Uint8Array;
}

export interface PbBootloaderShortDescription {
  $type: "protobuf.v1.PbBootloaderShortDescription";
  /**
   * image identifier for download from different sinks
   * e.g. https://i2.hdslb.com/bfs/archive/2e3b2831c37cfad73ea2885ce0110e08b159ed0f.jpg
   * id is 2e3b2831c37cfad73ea2885ce0110e08b159ed0f
   */
  id: PbBootloaderShortDescription_ID | undefined;
  sinkType: number;
  size: number;
  usedBits: Uint8Array;
}

export interface PbBootloaderShortDescription_ID {
  $type: "protobuf.v1.PbBootloaderShortDescription.ID";
  id: Uint8Array;
  isHex: boolean;
}

export interface PbMsgWithChecksum {
  $type: "protobuf.v1.PbMsgWithChecksum";
  checksum: Uint8Array;
  longMsg: PbBootloaderDescription | undefined;
  shortMsg: PbBootloaderShortDescription | undefined;
}

function createBasePbFilePointer(): PbFilePointer {
  return { $type: "protobuf.v1.PbFilePointer", size: 0, url: "", usedBits: "" };
}

export const PbFilePointer = {
  $type: "protobuf.v1.PbFilePointer" as const,

  encode(message: PbFilePointer, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
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

  fromJSON(object: any): PbFilePointer {
    return {
      $type: PbFilePointer.$type,
      size: isSet(object.size) ? Number(object.size) : 0,
      url: isSet(object.url) ? String(object.url) : "",
      usedBits: isSet(object.usedBits) ? String(object.usedBits) : "",
    };
  },

  toJSON(message: PbFilePointer): unknown {
    const obj: any = {};
    message.size !== undefined && (obj.size = Math.round(message.size));
    message.url !== undefined && (obj.url = message.url);
    message.usedBits !== undefined && (obj.usedBits = message.usedBits);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbFilePointer>, I>>(object: I): PbFilePointer {
    const message = createBasePbFilePointer();
    message.size = object.size ?? 0;
    message.url = object.url ?? "";
    message.usedBits = object.usedBits ?? "";
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
      PbFilePointer.encode(message.indexFileHead, writer.uint32(50).fork()).ldelim();
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
          message.indexFileHead = PbFilePointer.decode(reader, reader.uint32());
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
      indexFileHead: isSet(object.indexFileHead) ? PbFilePointer.fromJSON(object.indexFileHead) : undefined,
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
      (obj.indexFileHead = message.indexFileHead ? PbFilePointer.toJSON(message.indexFileHead) : undefined);
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
      ? PbFilePointer.fromPartial(object.indexFileHead)
      : undefined;
    return message;
  },
};

messageTypeRegistry.set(PbBootloaderFile.$type, PbBootloaderFile);

function createBasePbBootloaderDescription(): PbBootloaderDescription {
  return { $type: "protobuf.v1.PbBootloaderDescription", desc: undefined, password: new Uint8Array() };
}

export const PbBootloaderDescription = {
  $type: "protobuf.v1.PbBootloaderDescription" as const,

  encode(message: PbBootloaderDescription, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.desc !== undefined) {
      PbBootloaderShortDescription.encode(message.desc, writer.uint32(10).fork()).ldelim();
    }
    if (message.password.length !== 0) {
      writer.uint32(18).bytes(message.password);
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
          message.desc = PbBootloaderShortDescription.decode(reader, reader.uint32());
          break;
        case 2:
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
      desc: isSet(object.desc) ? PbBootloaderShortDescription.fromJSON(object.desc) : undefined,
      password: isSet(object.password) ? bytesFromBase64(object.password) : new Uint8Array(),
    };
  },

  toJSON(message: PbBootloaderDescription): unknown {
    const obj: any = {};
    message.desc !== undefined &&
      (obj.desc = message.desc ? PbBootloaderShortDescription.toJSON(message.desc) : undefined);
    message.password !== undefined &&
      (obj.password = base64FromBytes(message.password !== undefined ? message.password : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbBootloaderDescription>, I>>(object: I): PbBootloaderDescription {
    const message = createBasePbBootloaderDescription();
    message.desc = (object.desc !== undefined && object.desc !== null)
      ? PbBootloaderShortDescription.fromPartial(object.desc)
      : undefined;
    message.password = object.password ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(PbBootloaderDescription.$type, PbBootloaderDescription);

function createBasePbBootloaderShortDescription(): PbBootloaderShortDescription {
  return {
    $type: "protobuf.v1.PbBootloaderShortDescription",
    id: undefined,
    sinkType: 0,
    size: 0,
    usedBits: new Uint8Array(),
  };
}

export const PbBootloaderShortDescription = {
  $type: "protobuf.v1.PbBootloaderShortDescription" as const,

  encode(message: PbBootloaderShortDescription, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== undefined) {
      PbBootloaderShortDescription_ID.encode(message.id, writer.uint32(10).fork()).ldelim();
    }
    if (message.sinkType !== 0) {
      writer.uint32(16).uint32(message.sinkType);
    }
    if (message.size !== 0) {
      writer.uint32(24).uint32(message.size);
    }
    if (message.usedBits.length !== 0) {
      writer.uint32(34).bytes(message.usedBits);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbBootloaderShortDescription {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbBootloaderShortDescription();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = PbBootloaderShortDescription_ID.decode(reader, reader.uint32());
          break;
        case 2:
          message.sinkType = reader.uint32();
          break;
        case 3:
          message.size = reader.uint32();
          break;
        case 4:
          message.usedBits = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbBootloaderShortDescription {
    return {
      $type: PbBootloaderShortDescription.$type,
      id: isSet(object.id) ? PbBootloaderShortDescription_ID.fromJSON(object.id) : undefined,
      sinkType: isSet(object.sinkType) ? Number(object.sinkType) : 0,
      size: isSet(object.size) ? Number(object.size) : 0,
      usedBits: isSet(object.usedBits) ? bytesFromBase64(object.usedBits) : new Uint8Array(),
    };
  },

  toJSON(message: PbBootloaderShortDescription): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id ? PbBootloaderShortDescription_ID.toJSON(message.id) : undefined);
    message.sinkType !== undefined && (obj.sinkType = Math.round(message.sinkType));
    message.size !== undefined && (obj.size = Math.round(message.size));
    message.usedBits !== undefined &&
      (obj.usedBits = base64FromBytes(message.usedBits !== undefined ? message.usedBits : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbBootloaderShortDescription>, I>>(object: I): PbBootloaderShortDescription {
    const message = createBasePbBootloaderShortDescription();
    message.id = (object.id !== undefined && object.id !== null)
      ? PbBootloaderShortDescription_ID.fromPartial(object.id)
      : undefined;
    message.sinkType = object.sinkType ?? 0;
    message.size = object.size ?? 0;
    message.usedBits = object.usedBits ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(PbBootloaderShortDescription.$type, PbBootloaderShortDescription);

function createBasePbBootloaderShortDescription_ID(): PbBootloaderShortDescription_ID {
  return { $type: "protobuf.v1.PbBootloaderShortDescription.ID", id: new Uint8Array(), isHex: false };
}

export const PbBootloaderShortDescription_ID = {
  $type: "protobuf.v1.PbBootloaderShortDescription.ID" as const,

  encode(message: PbBootloaderShortDescription_ID, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id.length !== 0) {
      writer.uint32(10).bytes(message.id);
    }
    if (message.isHex === true) {
      writer.uint32(16).bool(message.isHex);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbBootloaderShortDescription_ID {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbBootloaderShortDescription_ID();
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

  fromJSON(object: any): PbBootloaderShortDescription_ID {
    return {
      $type: PbBootloaderShortDescription_ID.$type,
      id: isSet(object.id) ? bytesFromBase64(object.id) : new Uint8Array(),
      isHex: isSet(object.isHex) ? Boolean(object.isHex) : false,
    };
  },

  toJSON(message: PbBootloaderShortDescription_ID): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = base64FromBytes(message.id !== undefined ? message.id : new Uint8Array()));
    message.isHex !== undefined && (obj.isHex = message.isHex);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbBootloaderShortDescription_ID>, I>>(
    object: I,
  ): PbBootloaderShortDescription_ID {
    const message = createBasePbBootloaderShortDescription_ID();
    message.id = object.id ?? new Uint8Array();
    message.isHex = object.isHex ?? false;
    return message;
  },
};

messageTypeRegistry.set(PbBootloaderShortDescription_ID.$type, PbBootloaderShortDescription_ID);

function createBasePbMsgWithChecksum(): PbMsgWithChecksum {
  return {
    $type: "protobuf.v1.PbMsgWithChecksum",
    checksum: new Uint8Array(),
    longMsg: undefined,
    shortMsg: undefined,
  };
}

export const PbMsgWithChecksum = {
  $type: "protobuf.v1.PbMsgWithChecksum" as const,

  encode(message: PbMsgWithChecksum, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.checksum.length !== 0) {
      writer.uint32(10).bytes(message.checksum);
    }
    if (message.longMsg !== undefined) {
      PbBootloaderDescription.encode(message.longMsg, writer.uint32(18).fork()).ldelim();
    }
    if (message.shortMsg !== undefined) {
      PbBootloaderShortDescription.encode(message.shortMsg, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbMsgWithChecksum {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbMsgWithChecksum();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.checksum = reader.bytes();
          break;
        case 2:
          message.longMsg = PbBootloaderDescription.decode(reader, reader.uint32());
          break;
        case 3:
          message.shortMsg = PbBootloaderShortDescription.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbMsgWithChecksum {
    return {
      $type: PbMsgWithChecksum.$type,
      checksum: isSet(object.checksum) ? bytesFromBase64(object.checksum) : new Uint8Array(),
      longMsg: isSet(object.longMsg) ? PbBootloaderDescription.fromJSON(object.longMsg) : undefined,
      shortMsg: isSet(object.shortMsg) ? PbBootloaderShortDescription.fromJSON(object.shortMsg) : undefined,
    };
  },

  toJSON(message: PbMsgWithChecksum): unknown {
    const obj: any = {};
    message.checksum !== undefined &&
      (obj.checksum = base64FromBytes(message.checksum !== undefined ? message.checksum : new Uint8Array()));
    message.longMsg !== undefined &&
      (obj.longMsg = message.longMsg ? PbBootloaderDescription.toJSON(message.longMsg) : undefined);
    message.shortMsg !== undefined &&
      (obj.shortMsg = message.shortMsg ? PbBootloaderShortDescription.toJSON(message.shortMsg) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbMsgWithChecksum>, I>>(object: I): PbMsgWithChecksum {
    const message = createBasePbMsgWithChecksum();
    message.checksum = object.checksum ?? new Uint8Array();
    message.longMsg = (object.longMsg !== undefined && object.longMsg !== null)
      ? PbBootloaderDescription.fromPartial(object.longMsg)
      : undefined;
    message.shortMsg = (object.shortMsg !== undefined && object.shortMsg !== null)
      ? PbBootloaderShortDescription.fromPartial(object.shortMsg)
      : undefined;
    return message;
  },
};

messageTypeRegistry.set(PbMsgWithChecksum.$type, PbMsgWithChecksum);

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
