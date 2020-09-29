const merge = require('merge');
const path = require('path');

var base = require('./webpack.config');

function resolve(dir) {
    return path.join(__dirname, '..', dir);
}

module.exports = merge.recursive(base, {
    target: 'node',
    entry: {
        main: ['babel-polyfill','./src/cjs-module.js',]
    },
    output: {
        library: 'closet',
        libraryTarget: 'commonjs2',
        filename: './closet.viewer.js'
    },
    optimization: {
        minimize: false
    },
})

