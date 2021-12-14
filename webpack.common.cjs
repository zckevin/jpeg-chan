const path = require("path");
const webpack = require("webpack");

const indexConfig = {
  target: "web",
  entry: "./src/weibo-jpeg-decoder/index.js",
  output: {
    library: "weibo_jpeg_decoder",
    path: path.resolve(__dirname, "dist"),
    filename: "decoder.js",
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

module.exports = [indexConfig];
