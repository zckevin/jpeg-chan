const path = require("path");
const webpack = require("webpack");

const config = {
  target: "webworker",
  entry: path.resolve(__dirname, "index.js"),
  output: {
    library: "jpeg_decoder",
    path: path.resolve(__dirname, "dist"),
    publicPath: '',
    filename: "jpeg-decoder.js",
  },
  module: {},
  plugins: [],
  resolve: {
    fallback: {
      fs: false,
      path: false,
      assert: false,
    }
  },
};

module.exports = config;
