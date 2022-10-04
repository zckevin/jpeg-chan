import { GenDescString, ParseDescString, BootloaderDescription } from "../../protobuf"
import { UsedBits } from "../../src/bits-manipulation";
import { SinkType } from "../../src/common-types";
import _ from "lodash"

const desc: BootloaderDescription = {
  id: "e3b2831c37cfad73ea2885ce0110e08b159ed0f",
  password: Buffer.from("password"),
  size: 1024,
  sinkType: SinkType.bilibili,
  usedBits: new UsedBits(1, 4),
};

test("GenDescString short desc", () => {
  const descStr = GenDescString(desc, true);
  console.log(descStr, descStr.length);
  const decoded = ParseDescString(descStr);
  expect(_.omit(decoded, ["password"])).toEqual(_.omit(desc, ["password"]));
})

test("GenDescString long desc", () => {
  const descStr = GenDescString(desc, false);
  console.log(descStr, descStr.length);
  const decoded = ParseDescString(descStr);
  expect(decoded).toEqual(desc);
})

test("Parse incorrect hex would throw", () => {
  expect(() => ParseDescString("random-string")).toThrow(/ParseDescHex error/);
})

/*
test("zcsb", () => {
  const msg = PbTest.fromPartial({
    $type: PbTest.$type,
    id: PbTest_ID.fromJSON({
      id: Buffer.from("e3b2831c37cfad73ea2885ce0110e08b159ed0f", "hex"),
      isHex: true,
    }),
    sinkType: SinkType.bilibili,
    size: 1024,
    usedBits: Buffer.from(new UsedBits(1, 4).toString()),
  })
  const desc = Buffer.from(PbTest.encode(msg).finish()).toString("base64");
  console.log(desc, desc.length);

  const wrapperMsg = PbTest2.fromPartial({
    $type: PbTest2.$type,
    msg,
    checksum: Buffer.from("12345")
  })
  const desc2 = Buffer.from(PbTest2.encode(wrapperMsg).finish()).toString("base64");
  console.log(desc2, desc2.length);

  const longMsg = PbTest2.fromPartial({
    msg2: PbTest3.fromPartial({
      $type: PbTest3.$type,
      msg: msg,
      password: Buffer.from("1123456782345678"),
    }),
    checksum: Buffer.from("12345")
  })
  const desc3 = Buffer.from(PbTest2.encode(longMsg).finish()).toString("base64");
  console.log(desc3, desc3.length);
})

test("zcsb", () => {
  const bytesMsg = PbBytesID.fromPartial({
    $type: PbBytesID.$type,
    id: Buffer.from("29e7d78410d937a7e66522e59cc7beb701de87ae", "hex"),
  });
  // ChQp59eEENk3p+ZlIuWcx763Ad6Hrg==
  console.log(Buffer.from(PbBytesID.encode(bytesMsg).finish()).toString("base64"));
  const stringMsg = PbStringId.fromPartial({
    $type: PbStringId.$type,
    id: "29e7d78410d937a7e66522e59cc7beb701de87ae",
  });
  // CigyOWU3ZDc4NDEwZDkzN2E3ZTY2NTIyZTU5Y2M3YmViNzAxZGU4N2Fl
  console.log(Buffer.from(PbStringId.encode(stringMsg).finish()).toString("base64"));
});
*/