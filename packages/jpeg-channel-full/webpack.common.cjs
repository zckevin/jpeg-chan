const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

const config = {
  target: "node",
  entry: path.resolve(__dirname, "index.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "full.js",
    libraryTarget: 'commonjs2',
  },
  // TODO: fix this?
  // manually copy wasm file to dist
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "../../node_modules/@saschazar/wasm-mozjpeg/wasm_mozjpeg.wasm"),
          to: path.resolve(__dirname, "dist")
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.node$/,
        loader: "node-loader",
      },
    ],
  },
};

module.exports = config;
