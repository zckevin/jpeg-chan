import protobufjs from "protobufjs";
import crypto from "crypto";

protobufjs.load("jpegFile.proto", (err, root) => {
  if (err)
    throw err;

  const Message = root.lookupType("BootloaderDescription");
  const buf = Message.encode(Message.create({
    type: 1,
    size: 1112,
    id: "0163161b889c3ec7ad0c7b0d60603dd6e66ff2f5",
    password: crypto.randomBytes(8),
  })).finish()
  console.log(buf.toString("hex"));
});
// 080010d808-0163161b889c3ec7ad0c7b0d60603dd6e66ff2f5-114313
