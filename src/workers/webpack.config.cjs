const path = require("path");
const { copyWasmFilePugin } = require("../../webpack.utils.cjs");

const config = {
  target: "node",
  entry: path.resolve(__dirname, "worker.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "worker.js",
    libraryTarget: 'commonjs2',
  },
  plugins: [
    copyWasmFilePugin("nanojpeg-wasm", __dirname),
  ],
};

module.exports = config;