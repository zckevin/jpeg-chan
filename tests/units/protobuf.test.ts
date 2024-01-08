import { GenDescString, ParseDescString, BootloaderDescription, PbFilePointer, CreateShortResourceID } from "../../protobuf"
import { SinkType } from "../../src/common-types";
import _ from "lodash"

const idString = "e3b2831c37cfad73ea2885ce0110e08b159ed0f";
const password = Buffer.from("password");
const fp: PbFilePointer = {
  $type: PbFilePointer.$type,
  size: 1024,
  usedBits: "1-2",
  checksum: Buffer.from("123"),
  resources: [CreateShortResourceID(idString, SinkType.bilibili, 1)],
}

test("GenDescString desc", () => {
  const descStr = GenDescString(fp, password);
  const desc = ParseDescString(descStr);
  expect(desc.password).toEqual(password);
  expect(desc.fp).toEqual(fp);
})

test("Parse incorrect hex would throw", () => {
  expect(() => ParseDescString("random-string")).toThrow(/Invalid URL/);
})
