const merge = require('webpack-merge');
const configs = require('./webpack.common.cjs');
const TerserPlugin = require("terser-webpack-plugin");

const terserOptions = {
  ecma: undefined,
  parse: {},
  compress: {},
  mangle: true,
  module: false,
  output: null,
  format: null,
  toplevel: false,
  nameCache: null,
  ie8: false,
  keep_classnames: undefined,
  keep_fnames: false,
  safari10: false,
};

module.exports = configs.map((config) => {
  // add min to output filename
  const tmp = config.output.filename.split(".");
  tmp.splice(-1, 0, "min");
  config.output.filename = tmp.join(".");

  return merge(config, {
    mode: 'production',
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin({ terserOptions })],
    },
  })
});

