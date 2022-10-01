const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const config = {
  target: "node",
  entry: path.resolve(__dirname, "worker.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "worker.js",
    libraryTarget: 'commonjs2',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "../../node_modules/**/*.wasm"),
          to: path.resolve(__dirname, "dist", "[name][ext]"),
        },
      ],
    }),
  ],
};

module.exports = config;