//@ts-check

'use strict';

const path = require('path');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const ReactRefreshTypeScript = require('react-refresh-typescript');

const isDevelopment = process.env.NODE_ENV !== 'production';

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/

  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
  },
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
};

/** @type WebpackConfig */
const webviewConfig = {
  target: 'web',
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    BuilderMode: './src/core/entries/builderModeEntry.tsx',
    Sidebar: './src/core/entries/sidebarEntry.tsx',
    ActionViewer: './src/core/entries/actionViewer.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    publicPath: 'http://localhost:3000/',
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              getCustomTransformers: () => ({
                before: isDevelopment ? [ReactRefreshTypeScript.default()] : [],
              }),
              transpileOnly: isDevelopment,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  devtool: isDevelopment ? 'eval-cheap-module-source-map' : 'source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      watch: false, // Prevent watching the output directory
    },
    hot: true,
    liveReload: false, // Disable live reload to prevent full page refreshes
    port: 3000,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    client: {
      overlay: {
        runtimeErrors: (error) => {
          const ignoreErrors = ['ResizeObserver loop completed with undelivered notifications.'];
          return !ignoreErrors.includes(error.message);
        },
      },
      webSocketURL: 'ws://localhost:3000/ws', // Explicit WebSocket URL
    },
    watchFiles: [], // Don't watch source files as static files
  },
  plugins: isDevelopment
    ? [
        new ReactRefreshWebpackPlugin({
          overlay: false, // VS Code webviews may have issues with the error overlay
        }),
      ]
    : [],
};
module.exports = [extensionConfig, webviewConfig];
