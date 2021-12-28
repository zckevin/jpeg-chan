const browserDecoderConfig = require("./packages/jpeg-channel-browser-decoder/webpack.common.cjs");
const fullConfig = require("./packages/jpeg-channel-full/webpack.common.cjs");

module.exports = [fullConfig, browserDecoderConfig];
