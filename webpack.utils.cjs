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

module.exports = {
  copyFileFromNodeModulesPugin,
}