const merge = require("webpack-merge");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin

const fullConfig = require("./packages/jpeg-channel-full/webpack.common.cjs");
const browserDecoderConfig = require("./packages/jpeg-channel-browser-decoder/webpack.common.cjs");
const wasmDecoderConfig = require("./packages/jpeg-channel-wasm-decoder/webpack.common.cjs");
const fileConfig = require("./packages/jpeg-file/webpack.config.cjs");
const workerConfig = require("./src/workers/webpack.config.cjs");

const moduleConfig = {
  rules: [
    {
      test: /\.(png|jpe?g|gif|wasm)$/i,
      use: [{ loader: 'file-loader' }]
    },
    {
      test: /\.ts$/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        }
      ]
    },
    {
      test: /\.node$/,
      use: "node-loader",
    }
  ],
};

const configs = [
  // fullConfig,
  // browserDecoderConfig,
  // wasmDecoderConfig,
  fileConfig,
  // workerConfig
].map((config) => merge(config, {
  module: moduleConfig,
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.tsx', '.ts', '.json', ".wasm"],
    fallback: {
      os: false,
      tty: false,
      util: false,
      stream: require.resolve("stream-browserify"),
      crypto: require.resolve("crypto-browserify"),
    }
  },
  // plugins: [new BundleAnalyzerPlugin()],
  output: {
    clean: true,
  },
}))

module.exports = {
  configs,
  moduleConfig,
}