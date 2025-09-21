const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      popup: './src/popup/index.tsx',
      options: './src/options/index.tsx',
      content: './src/content/index.ts',
      background: './src/background/index.ts',
      login: './src/login/loginScript.js',
      onboarding: './src/onboarding/onboardingScript.tsx',
      'content/oauth-bridge': './src/content/oauth-bridge.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name]/[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: { noEmit: false }
            }
          },
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      },
      fallback: {
        "process": require.resolve("process/browser"),
        "buffer": require.resolve("buffer"),
        "util": require.resolve("util")
      }
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || 'http://localhost:3001'),
        'global': 'globalThis'
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer']
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup/popup.html',
        chunks: ['popup']
      }),
      new HtmlWebpackPlugin({
        template: './src/options/options.html',
        filename: 'options/options.html',
        chunks: ['options']
      }),
      new HtmlWebpackPlugin({
        template: './src/login/login.html',
        filename: 'login/login.html',
        chunks: ['login']
      }),
      new HtmlWebpackPlugin({
        template: './src/onboarding/onboarding.html',
        filename: 'onboarding/onboarding.html',
        chunks: ['onboarding']
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/manifest.json',
            to: 'manifest.json'
          },
          {
            from: 'src/assets',
            to: 'assets',
            noErrorOnMissing: true
          },
          {
            from: 'src/content/content.css',
            to: 'content/content.css'
          }
        ]
      }),
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: '[name]/[name].css'
        })
      ] : [])
    ],
    devtool: isProduction ? false : 'cheap-module-source-map',
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    }
  };
};
