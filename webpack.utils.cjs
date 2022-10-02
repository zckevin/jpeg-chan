const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

function copyWasmFilePugin(moduleName, dirname) {
  return new CopyPlugin({
    patterns: [
      {
        from: path.posix.join(
          path.resolve(__dirname, "node_modules", moduleName, "**").replace(/\\/g, "/"),
          "*.wasm"
        ),
        to: path.resolve(dirname, "dist", "[name][ext]"),
      },
    ],
  });
}

module.exports = {
  copyWasmFilePugin,
}