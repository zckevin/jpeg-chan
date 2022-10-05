const path = require("path");
const { copyFileFromNodeModulesPugin } = require("../../webpack.utils.cjs");

const config = {
  target: "node",
  entry: {
    "index": path.resolve(__dirname, "index.ts"),
    "jpeg-worker": path.resolve(__dirname, "../../src/workers/worker.ts"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    libraryTarget: 'commonjs2',
  },
  plugins: [
    copyFileFromNodeModulesPugin("nanojpeg-wasm", __dirname, "*.wasm"),
    copyFileFromNodeModulesPugin("@saschazar/wasm-mozjpeg", __dirname, "*.wasm"),
    copyFileFromNodeModulesPugin("@zckevin/tinypool-cjs", __dirname, "worker.js"),
    copyFileFromNodeModulesPugin("@zckevin/tinypool-cjs", __dirname, "chunk-*.js"),
  ],
};

module.exports = config;
