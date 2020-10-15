const path = require('path');
const webpack = require('webpack');

function resolve(dir) {
  return path.join(__dirname, '.', dir);
}

module.exports = {
  entry: {
    'main': [
      'babel-polyfill',
      './src/index.js',
    ],
  },
  output: {
    filename: './closet.viewer.js',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        include: resolve('src'),
        exclude: [/\.spec\.ts$/]
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: resolve('src'),
      },
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 900000,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      PRODUCTION: process.env.NODE_ENV === 'production' ? JSON.stringify(true) : JSON.stringify(false),
    }),
  ],
  node: {
    fs: 'empty',
  },
  resolve: {
    extensions: ['.js', '.json', '.ts'],
    alias: {
      '@': resolve('src'),
      '@bg': resolve('src/lib/clo/background/'),
      'three': resolve('node_modules/three/src/Three')
    },
  },
  devServer: {
    host: 'dev.clo-set.com',
    hot: true,
    port: 8080,
    contentBase: path.resolve('dist'),
    publicPath: '/',
  },
};
