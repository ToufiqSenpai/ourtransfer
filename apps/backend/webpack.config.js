const { NxAppWebpackPlugin } = require("@nx/webpack/app-plugin")
const { join } = require("path")
const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = (_, context) => {
  const isProduction = context.configuration === 'production'

  return {
    output: {
      path: join(__dirname, "../../dist/apps/backend"),
    },
    plugins: [
      new NxAppWebpackPlugin({
        target: "node",
        compiler: "tsc",
        main: "./src/main.ts",
        tsConfig: "./tsconfig.app.json",
        optimization: isProduction,
        outputHashing: "none",
        generatePackageJson: true,
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "app-config*.json",
            to: './',
            context: __dirname
          }
        ]
      })
    ]
  }
}
