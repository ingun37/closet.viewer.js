const path = require('path');
const webpack = require('webpack');

function resolve (dir) {
    return path.join(__dirname, '.', dir);
}

module.exports = {
    output: {
        filename: './clo.viewer.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                include: resolve('src')
            },
            {
                test: /\.(png|jpg|gif)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 900000
                        }
                    }
                ]
            }
        ],
    },
    node: {
        fs: 'empty'
    },
    resolve: {
        extensions: ['.js', '.json'],
        alias: {
            '@':  resolve('src'),
            '@bg':  resolve('src/lib/clo/background/'),
        }
    },
    devServer: {
        hot: true,
        port: 8080,
        contentBase: path.resolve('dist'),
        publicPath: "/",
    }
};