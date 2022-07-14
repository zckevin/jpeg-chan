import path from 'path';
import { fileURLToPath } from 'url';
import protobufjs from "protobufjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ProtobufFactory {
  constructor() {
    this.initDone = false;
  }

  async initPb() {
    if (this.initDone) {
      return;
    }
    let resolveFn;
    const promise = new Promise(resolve => { resolveFn = resolve });

    protobufjs.load(path.join(__dirname, "jpegFile.proto"), (err, root) => {
      if (err)
        throw err;
      this.PbBootloaderDescription = root.lookupType("BootloaderDescription");
      this.PbBootloaderFile = root.lookupType("BootloaderFile");
      this.PbIndexFile = root.lookupType("IndexFile");
      this.PbFileChunk = root.lookupType("FileChunk");

      this.initDone = true;
      resolveFn();
    });
    return promise;
  }
}

export const pbFactory = new ProtobufFactory();