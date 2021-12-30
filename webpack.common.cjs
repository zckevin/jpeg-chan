const fullConfig = require("./packages/jpeg-channel-full/webpack.common.cjs");
const browserDecoderConfig = require("./packages/jpeg-channel-browser-decoder/webpack.common.cjs");
const wasmDecoderConfig = require("./packages/jpeg-channel-wasm-decoder/webpack.common.cjs");

module.exports = [fullConfig, browserDecoderConfig, wasmDecoderConfig];
