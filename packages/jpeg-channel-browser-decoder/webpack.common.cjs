const path = require("path");
const webpack = require("webpack");

const config = {
  target: "web",
  entry: path.resolve(__dirname, "index.ts"),
  output: {
    library: "jpeg_decoder",
    path: path.resolve(__dirname, "dist"),
    publicPath: '',
    filename: "jpeg-decoder.js",
  },
  module: {},
  plugins: [],
};

module.exports = config;
