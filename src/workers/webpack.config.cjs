const path = require("path");
const { copyFileFromNodeModulesPugin } = require("../../webpack.utils.cjs");

const config = {
  target: "node",
  entry: path.resolve(__dirname, "worker.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "jpeg-worker.js",
    libraryTarget: 'commonjs2',
  },
  plugins: [
    copyFileFromNodeModulesPugin("nanojpeg-wasm", __dirname, "*.wasm"),
    copyFileFromNodeModulesPugin("@saschazar/wasm-mozjpeg", __dirname, "*.wasm"),
  ],
};

module.exports = config;