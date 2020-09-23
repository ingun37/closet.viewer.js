const path = require('path');
const webpack = require('webpack');

function resolve(dir) {
  return path.join(__dirname, '.', dir);
}

module.exports = {
  module: {
    rules: [
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
    extensions: ['.js', '.json'],
    alias: {
      '@': resolve('src'),
      '@bg': resolve('src/lib/clo/background/'),
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
