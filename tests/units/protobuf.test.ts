import { PbBootloaderDescription, GenDescHex, ParseDescHex } from "../../protobuf"

const id = "test-id";
const desc = PbBootloaderDescription.fromPartial({
  $type: PbBootloaderDescription.$type,
  id,
})

test("Desc hex gen/parse", () => {
  const descHex = GenDescHex(desc);
  console.log(descHex, descHex.length);
  const decoded = ParseDescHex(descHex);
  expect(decoded).toEqual(desc);
})

test("Parse incorrect hex would throw", () => {
  expect(() => ParseDescHex("random-string")).toThrow(/typeUrl mismatch/);
})