import _ from "lodash";
import crypto from "crypto";
import { PbFilePointer, PbResourceURL, PbResourceURL_ID, PbResourceURL_ShortURL } from "./gen/protobuf/v1/jpeg_file";
import { MessageType, UnknownMessage } from "./gen/typeRegistry";
import { assert } from "../src/assert";
import { sinkDelegate } from "../src/sinks";
import { SinkType } from "../src/common-types";

export * from "./gen/protobuf/v1/jpeg_file";
export * as pbTypeRegistry from "./gen/typeRegistry";

const PROTOCOL_SCHEME = "jpegchan"
const PROTOCOL_PASSWORD = "password"
const PROTOCOL_PASSWORD_ENCODING = "hex"

const CHECKSUM_LENGTH = 4;
const CHECKSUM_HASH_METHOD = "sha256";
const DESC_ENCODING = "base64url";

function hashPbMessage<T extends MessageType>(ctor: T, msg: UnknownMessage): Uint8Array {
  const buf = ctor.encode(msg).finish();
  const hash = crypto.createHash(CHECKSUM_HASH_METHOD).update(buf);
  return hash.digest().slice(0, CHECKSUM_LENGTH);
}

export function DecodeResourceID(id: string) {
  // try to store `id` string in hex format to save space if possible
  let buf = Buffer.from(id, "hex");
  let isHex = true;
  if (buf.toString("hex") !== id) {
    buf = Buffer.from(id);
    isHex = false;
  }
  return PbResourceURL_ID.fromPartial({
    $type: PbResourceURL_ID.$type,
    id: buf,
    isHex,
  });
}

export function EncodeResourceID(rid: PbResourceURL_ID) {
  const { id, isHex } = rid;
  return Buffer.from(id).toString(isHex ? "hex" : "ascii")
}

export function CreateShortResourceID(idString: string, sinkType: SinkType) {
  const shortUrl: PbResourceURL_ShortURL = {
    $type: PbResourceURL_ShortURL.$type,
    id: DecodeResourceID(idString),
    sinkType: sinkType,
    sinkTypeMinor: 0,
  };
  const shortResource: PbResourceURL = {
    $type: PbResourceURL.$type,
    urlOneof: {
      $case: "shortUrl",
      shortUrl
    }
  };
  return shortResource;
}

export function GenDescString(fp: PbFilePointer, password: Uint8Array) {
  assert(fp.resources.length === 1);
  
  let resource: PbResourceURL;
  switch (fp.resources[0].urlOneof.$case) {
    case "url": {
      const urlString = fp.resources[0].urlOneof.url;
      const { sinkType, id } = sinkDelegate.GetTypeAndID(urlString);
      resource = CreateShortResourceID(id, sinkType);
      break;
    }
    case "shortUrl": {
      resource = fp.resources[0];
      break;
    }
    default: {
      throw new Error("invalid fp for gen desc")
    }
  }
  const shortFp: PbFilePointer = {
    $type: PbFilePointer.$type,
    size: fp.size,
    usedBits: fp.usedBits,
    checksum: fp.checksum,
    resources: [resource],
  };
  const encoded = Buffer.from(PbFilePointer.encode(shortFp).finish()).toString(DESC_ENCODING);
  const uri = new URL(`${PROTOCOL_SCHEME}://`);
  uri.host = encoded;
  uri.searchParams.set(PROTOCOL_PASSWORD, Buffer.from(password).toString(PROTOCOL_PASSWORD_ENCODING));
  return uri.toString();
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

interface descPasswordPair {
  desc: string;
  password: string;
}

function parseUri(uri: string): descPasswordPair {
  const u = new URL(uri);
  if (u.protocol !== PROTOCOL_SCHEME && u.protocol !== `${PROTOCOL_SCHEME}:`) {
    throw new Error(`invalid uri: ${uri}`)
  }
  const desc = u.host;
  const password = u.searchParams.get(PROTOCOL_PASSWORD)
  return {
    desc, password
  };
}

export interface BootloaderDescription {
  fp: PbFilePointer;
  password: Uint8Array;
}

export function ParseDescString(uri: string): BootloaderDescription {
  const { desc, password } = parseUri(uri);
  const buf = Buffer.from(desc, DESC_ENCODING);
  const fp = PbFilePointer.decode(buf);
  return {
    fp,
    password: Buffer.from(password, PROTOCOL_PASSWORD_ENCODING),
  }
}