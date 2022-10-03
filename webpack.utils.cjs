const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

function copyFileFromNodeModulesPugin(moduleName, dirname, filename) {
  return new CopyPlugin({
    patterns: [
      {
        from: path.posix.join(
          path.resolve(__dirname, "node_modules", moduleName, "**").replace(/\\/g, "/"),
          filename,
        ),
        to: path.resolve(dirname, "dist", "[name][ext]"),
      },
    ],
  });
}

const fallbackConfig = {
  fs: false,
  path: false,
  child_process: false,
  assert: false,
  os: false,
  process: false,
  util: false,
  tty: false,
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("stream-browserify"),
};

module.exports = {
  copyFileFromNodeModulesPugin,
  fallbackConfig,
}