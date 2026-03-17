const { mergeWithRules } = require("webpack-merge");
const singleSpaDefaults = require("webpack-config-single-spa-react-ts");
const webpack = require("webpack");

const orgName = "chainbase-labs";

const projectName = "buildermaps-io";

module.exports = (webpackConfigEnv, argv) => {
  const defaultConfig = singleSpaDefaults({
    orgName,
    projectName,
    webpackConfigEnv,
    argv,
  });

  return mergeWithRules({
    externals: "replace",
    module: {
      rules: {
        test: "match",
        use: "replace",
      },
    },
  })(defaultConfig, {
    devServer: {
      client: {
        overlay: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: "postcss-loader",
            },
          ],
        },
      ],
    },
    output: process.env.WEBPACK_SERVE
      ? {}
      : {
          filename: (pathData) => {
            if (pathData.chunk.name === "main") {
              return `${orgName}-${projectName}-main.[contenthash].js`;
            }
            return `${orgName}-${projectName}.[contenthash].js`;
          },
          clean: false,
        },
    externals: process.env.SHARED_MODULES?.replace(/^"|"$/g, "")
      .split(",")
      .filter((m) => m !== "single-spa")
      .concat("react", "react-dom") || ["react", "react-dom"],
    plugins: [
      new webpack.ProvidePlugin({
        process: "process",
      }),
      new webpack.DefinePlugin({
        "process.env": JSON.stringify(process.env || {}),
      }),
    ],
    resolve: {
      fallback: {
        process: require.resolve("process"),
      },
    },
  });
};
