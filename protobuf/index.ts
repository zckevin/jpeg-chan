import crypto from "crypto";
import { PbBootloaderDescription, PbMsgWithChecksum } from "./gen/protobuf/v1/jpeg_file";
import { MessageType, UnknownMessage } from "./gen/typeRegistry";
import { Any } from "./gen/google/protobuf/any";
import { assert } from "../src/assert";
import _ from "lodash";

export * from "./gen/protobuf/v1/jpeg_file";
export * as pbTypeRegistry from "./gen/typeRegistry";

const CHECKSUM_BYTE_LENGTH = 6;

function hashPbMessage<T extends MessageType>(typ: T, msg: UnknownMessage): Uint8Array {
  const md5sum = crypto.createHash("md5");
  const buf = typ.encode(msg).finish();
  md5sum.update(buf);
  return md5sum.digest().slice(0, CHECKSUM_BYTE_LENGTH);
}

export function GenDescHex(desc: PbBootloaderDescription) {
  const checksumMsg: PbMsgWithChecksum = {
    $type: PbMsgWithChecksum.$type,
    msg: Any.fromJSON({
      $type: Any.$type,
      typeUrl: desc.$type,
      value: PbBootloaderDescription.encode(desc).finish(),
    }),
    checksum: hashPbMessage(PbBootloaderDescription, desc),
  };
  const buf = PbMsgWithChecksum.encode(checksumMsg).finish();
  return Buffer.from(buf).toString('hex');
}

export function ParseDescHex(descHex: string) {
  const buf = Buffer.from(descHex, "hex");
  const checksumMsg = PbMsgWithChecksum.decode(buf);
  assert(
    (checksumMsg.msg !== undefined) && 
    (checksumMsg.msg.typeUrl === PbBootloaderDescription.$type),
    "ParseDescHex error: typeUrl mismatch"
  );
  const desc = PbBootloaderDescription.decode(checksumMsg.msg.value);
  const checksum = hashPbMessage(PbBootloaderDescription, desc);
  assert(
    _.isEqual(checksum, checksumMsg.checksum),
    "ParseDescHex error: checksum mismatch"
  );
  return desc;
}