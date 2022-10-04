import crypto from "crypto";
import { PbBootloaderDescription, PbBootloaderShortDescription, PbBootloaderShortDescription_ID, PbMsgWithChecksum } from "./gen/protobuf/v1/jpeg_file";
import { MessageType, UnknownMessage } from "./gen/typeRegistry";
import { assert } from "../src/assert";
import _ from "lodash";
import { SinkType } from "../src/common-types";
import { UsedBits } from "../src/bits-manipulation";

export * from "./gen/protobuf/v1/jpeg_file";
export * as pbTypeRegistry from "./gen/typeRegistry";

const CHECKSUM_LENGTH = 4;
const CHECKSUM_HASH_METHOD = "sha256";
const DESC_ENCODING = "base64";

export interface BootloaderDescription {
  id: string;
  sinkType: SinkType;
  size: number;
  usedBits: UsedBits;
  password?: Uint8Array;
}

function hashPbMessage<T extends MessageType>(ctor: T, msg: UnknownMessage): Uint8Array {
  const buf = ctor.encode(msg).finish();
  const hash = crypto.createHash(CHECKSUM_HASH_METHOD).update(buf);
  return hash.digest().slice(0, CHECKSUM_LENGTH);
}

function encodeIDMsg(id: string) {
  let buf = Buffer.from(id, "hex");
  let isHex = true;
  if (buf.toString("hex") !== id) {
    buf = Buffer.from(id);
    isHex = false;
  }
  return PbBootloaderShortDescription_ID.fromPartial({
    $type: PbBootloaderShortDescription_ID.$type,
    id: buf,
    isHex,
  });
}

function createShortDescMsg(desc: BootloaderDescription) {
  const ctor = PbBootloaderShortDescription;
  const msg = ctor.fromPartial({
    $type: ctor.$type,
    id: encodeIDMsg(desc.id),
    sinkType: desc.sinkType,
    size: desc.size,
    usedBits: Buffer.from(desc.usedBits.toString()),
  });
  return {
    msg,
    checksum: hashPbMessage(ctor, msg),
  }
}

function createDescMsg(desc: BootloaderDescription) {
  const ctor = PbBootloaderDescription;
  const msg = ctor.fromPartial({
    $type: ctor.$type,
    desc: createShortDescMsg(desc).msg,
    password: desc.password,
  });
  return {
    msg,
    checksum: hashPbMessage(ctor, msg),
  }
}

export function GenDescString(desc: BootloaderDescription, useShortDesc = false) {
  const { msg, checksum } = useShortDesc ? createShortDescMsg(desc) : createDescMsg(desc);
  const checksumMsg: PbMsgWithChecksum = {
    $type: PbMsgWithChecksum.$type,
    longMsg: useShortDesc ? undefined : (msg as PbBootloaderDescription),
    shortMsg: useShortDesc ? (msg as PbBootloaderShortDescription) : undefined,
    checksum: checksum,
  };
  return Buffer.from(PbMsgWithChecksum.encode(checksumMsg).finish()).toString(DESC_ENCODING);
}


function parseAndVerifyChecksum<T extends MessageType>(ctor: T, buf: Uint8Array, expected: Uint8Array) {
  const msg = ctor.decode(buf);
  const checksum = hashPbMessage(ctor, msg);
  assert(
    _.isEqual(checksum, expected),
    "ParseDescHex error: checksum mismatch"
  );
  return msg;
}

function createBootloaderDescription(descMsg: PbBootloaderShortDescription): BootloaderDescription {
  return {
    id: Buffer.from(descMsg.id.id).toString(descMsg.id.isHex ? "hex" : "ascii"),
    sinkType: descMsg.sinkType,
    size: descMsg.size,
    usedBits: UsedBits.fromString(Buffer.from(descMsg.usedBits).toString()),
  };
}

export function ParseDescString(desc: string): BootloaderDescription {
  const buf = Buffer.from(desc, DESC_ENCODING);
  const checksumMsg = PbMsgWithChecksum.decode(buf);
  assert(
    !(checksumMsg.longMsg === undefined && checksumMsg.shortMsg === undefined),
    "ParseDescHex error: invalid message"
  );

  let ctor: MessageType;
  let fromMsg: UnknownMessage;
  if (checksumMsg.longMsg) {
    ctor = PbBootloaderDescription;
    fromMsg = checksumMsg.longMsg;
  } else {
    ctor = PbBootloaderShortDescription;
    fromMsg = checksumMsg.shortMsg;
  }
  const msg = parseAndVerifyChecksum(ctor, ctor.encode(fromMsg).finish(), checksumMsg.checksum);
  switch (msg.$type) {
    case PbBootloaderDescription.$type: {
      return {
        ...createBootloaderDescription((msg as PbBootloaderDescription).desc),
        password: (msg as PbBootloaderDescription).password,
      };
    }
    case PbBootloaderShortDescription.$type:
      return createBootloaderDescription(msg as PbBootloaderShortDescription);
    default:
      throw new Error(`ParseDescHex error: invalid type: ${msg.$type}`);
  }
}