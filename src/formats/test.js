import protobufjs from "protobufjs";

protobufjs.load("jpegFile.proto", (err, root) => {
  if (err)
    throw err;

  const Message = root.lookupType("BootloaderFile");
  const file = {
    length: 1024 * 10,
    chunkSize: 1024,
    indexFile: {
      length: 128,
      url: "sfsfs",
      usedBits: "1-5",
    },
    padding: 'sfsf2sfsf',
  }
  const errMsg = Message.verify(file);
  if (errMsg)
    throw Error(errMsg);

  const serialized = Message.encode(Message.create(file)).finish(); // produce: <Buffer 0a 03 66 6f 6f 10 1e>
  console.log(serialized, serialized.byteLength)

  console.log(Message.decode(serialized))
});
