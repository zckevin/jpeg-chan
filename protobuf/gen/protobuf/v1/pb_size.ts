/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { messageTypeRegistry } from "../../typeRegistry";

export const protobufPackage = "protobuf.v1";

export interface PbBytesID {
  $type: "protobuf.v1.PbBytesID";
  id: Uint8Array;
}

export interface PbStringId {
  $type: "protobuf.v1.PbStringId";
  id: string;
}

export interface PbTest {
  $type: "protobuf.v1.PbTest";
  id: PbTest_ID | undefined;
  sinkType: number;
  size: number;
  usedBits: Uint8Array;
}

export interface PbTest_ID {
  $type: "protobuf.v1.PbTest.ID";
  id: Uint8Array;
  isHex: boolean;
}

export interface PbTest3 {
  $type: "protobuf.v1.PbTest3";
  msg: PbTest | undefined;
  password: Uint8Array;
}

export interface PbTest2 {
  $type: "protobuf.v1.PbTest2";
  msg: PbTest | undefined;
  msg2: PbTest3 | undefined;
  checksum: Uint8Array;
}

function createBasePbBytesID(): PbBytesID {
  return { $type: "protobuf.v1.PbBytesID", id: new Uint8Array() };
}

export const PbBytesID = {
  $type: "protobuf.v1.PbBytesID" as const,

  encode(message: PbBytesID, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id.length !== 0) {
      writer.uint32(10).bytes(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbBytesID {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbBytesID();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbBytesID {
    return { $type: PbBytesID.$type, id: isSet(object.id) ? bytesFromBase64(object.id) : new Uint8Array() };
  },

  toJSON(message: PbBytesID): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = base64FromBytes(message.id !== undefined ? message.id : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbBytesID>, I>>(object: I): PbBytesID {
    const message = createBasePbBytesID();
    message.id = object.id ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(PbBytesID.$type, PbBytesID);

function createBasePbStringId(): PbStringId {
  return { $type: "protobuf.v1.PbStringId", id: "" };
}

export const PbStringId = {
  $type: "protobuf.v1.PbStringId" as const,

  encode(message: PbStringId, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbStringId {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbStringId();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbStringId {
    return { $type: PbStringId.$type, id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: PbStringId): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbStringId>, I>>(object: I): PbStringId {
    const message = createBasePbStringId();
    message.id = object.id ?? "";
    return message;
  },
};

messageTypeRegistry.set(PbStringId.$type, PbStringId);

function createBasePbTest(): PbTest {
  return { $type: "protobuf.v1.PbTest", id: undefined, sinkType: 0, size: 0, usedBits: new Uint8Array() };
}

export const PbTest = {
  $type: "protobuf.v1.PbTest" as const,

  encode(message: PbTest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== undefined) {
      PbTest_ID.encode(message.id, writer.uint32(10).fork()).ldelim();
    }
    if (message.sinkType !== 0) {
      writer.uint32(24).uint32(message.sinkType);
    }
    if (message.size !== 0) {
      writer.uint32(32).uint32(message.size);
    }
    if (message.usedBits.length !== 0) {
      writer.uint32(42).bytes(message.usedBits);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbTest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbTest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = PbTest_ID.decode(reader, reader.uint32());
          break;
        case 3:
          message.sinkType = reader.uint32();
          break;
        case 4:
          message.size = reader.uint32();
          break;
        case 5:
          message.usedBits = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbTest {
    return {
      $type: PbTest.$type,
      id: isSet(object.id) ? PbTest_ID.fromJSON(object.id) : undefined,
      sinkType: isSet(object.sinkType) ? Number(object.sinkType) : 0,
      size: isSet(object.size) ? Number(object.size) : 0,
      usedBits: isSet(object.usedBits) ? bytesFromBase64(object.usedBits) : new Uint8Array(),
    };
  },

  toJSON(message: PbTest): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id ? PbTest_ID.toJSON(message.id) : undefined);
    message.sinkType !== undefined && (obj.sinkType = Math.round(message.sinkType));
    message.size !== undefined && (obj.size = Math.round(message.size));
    message.usedBits !== undefined &&
      (obj.usedBits = base64FromBytes(message.usedBits !== undefined ? message.usedBits : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbTest>, I>>(object: I): PbTest {
    const message = createBasePbTest();
    message.id = (object.id !== undefined && object.id !== null) ? PbTest_ID.fromPartial(object.id) : undefined;
    message.sinkType = object.sinkType ?? 0;
    message.size = object.size ?? 0;
    message.usedBits = object.usedBits ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(PbTest.$type, PbTest);

function createBasePbTest_ID(): PbTest_ID {
  return { $type: "protobuf.v1.PbTest.ID", id: new Uint8Array(), isHex: false };
}

export const PbTest_ID = {
  $type: "protobuf.v1.PbTest.ID" as const,

  encode(message: PbTest_ID, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id.length !== 0) {
      writer.uint32(10).bytes(message.id);
    }
    if (message.isHex === true) {
      writer.uint32(16).bool(message.isHex);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbTest_ID {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbTest_ID();
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

  fromJSON(object: any): PbTest_ID {
    return {
      $type: PbTest_ID.$type,
      id: isSet(object.id) ? bytesFromBase64(object.id) : new Uint8Array(),
      isHex: isSet(object.isHex) ? Boolean(object.isHex) : false,
    };
  },

  toJSON(message: PbTest_ID): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = base64FromBytes(message.id !== undefined ? message.id : new Uint8Array()));
    message.isHex !== undefined && (obj.isHex = message.isHex);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbTest_ID>, I>>(object: I): PbTest_ID {
    const message = createBasePbTest_ID();
    message.id = object.id ?? new Uint8Array();
    message.isHex = object.isHex ?? false;
    return message;
  },
};

messageTypeRegistry.set(PbTest_ID.$type, PbTest_ID);

function createBasePbTest3(): PbTest3 {
  return { $type: "protobuf.v1.PbTest3", msg: undefined, password: new Uint8Array() };
}

export const PbTest3 = {
  $type: "protobuf.v1.PbTest3" as const,

  encode(message: PbTest3, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.msg !== undefined) {
      PbTest.encode(message.msg, writer.uint32(10).fork()).ldelim();
    }
    if (message.password.length !== 0) {
      writer.uint32(18).bytes(message.password);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbTest3 {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbTest3();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.msg = PbTest.decode(reader, reader.uint32());
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

  fromJSON(object: any): PbTest3 {
    return {
      $type: PbTest3.$type,
      msg: isSet(object.msg) ? PbTest.fromJSON(object.msg) : undefined,
      password: isSet(object.password) ? bytesFromBase64(object.password) : new Uint8Array(),
    };
  },

  toJSON(message: PbTest3): unknown {
    const obj: any = {};
    message.msg !== undefined && (obj.msg = message.msg ? PbTest.toJSON(message.msg) : undefined);
    message.password !== undefined &&
      (obj.password = base64FromBytes(message.password !== undefined ? message.password : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbTest3>, I>>(object: I): PbTest3 {
    const message = createBasePbTest3();
    message.msg = (object.msg !== undefined && object.msg !== null) ? PbTest.fromPartial(object.msg) : undefined;
    message.password = object.password ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(PbTest3.$type, PbTest3);

function createBasePbTest2(): PbTest2 {
  return { $type: "protobuf.v1.PbTest2", msg: undefined, msg2: undefined, checksum: new Uint8Array() };
}

export const PbTest2 = {
  $type: "protobuf.v1.PbTest2" as const,

  encode(message: PbTest2, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.msg !== undefined) {
      PbTest.encode(message.msg, writer.uint32(10).fork()).ldelim();
    }
    if (message.msg2 !== undefined) {
      PbTest3.encode(message.msg2, writer.uint32(18).fork()).ldelim();
    }
    if (message.checksum.length !== 0) {
      writer.uint32(26).bytes(message.checksum);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PbTest2 {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePbTest2();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.msg = PbTest.decode(reader, reader.uint32());
          break;
        case 2:
          message.msg2 = PbTest3.decode(reader, reader.uint32());
          break;
        case 3:
          message.checksum = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PbTest2 {
    return {
      $type: PbTest2.$type,
      msg: isSet(object.msg) ? PbTest.fromJSON(object.msg) : undefined,
      msg2: isSet(object.msg2) ? PbTest3.fromJSON(object.msg2) : undefined,
      checksum: isSet(object.checksum) ? bytesFromBase64(object.checksum) : new Uint8Array(),
    };
  },

  toJSON(message: PbTest2): unknown {
    const obj: any = {};
    message.msg !== undefined && (obj.msg = message.msg ? PbTest.toJSON(message.msg) : undefined);
    message.msg2 !== undefined && (obj.msg2 = message.msg2 ? PbTest3.toJSON(message.msg2) : undefined);
    message.checksum !== undefined &&
      (obj.checksum = base64FromBytes(message.checksum !== undefined ? message.checksum : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<PbTest2>, I>>(object: I): PbTest2 {
    const message = createBasePbTest2();
    message.msg = (object.msg !== undefined && object.msg !== null) ? PbTest.fromPartial(object.msg) : undefined;
    message.msg2 = (object.msg2 !== undefined && object.msg2 !== null) ? PbTest3.fromPartial(object.msg2) : undefined;
    message.checksum = object.checksum ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(PbTest2.$type, PbTest2);

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
