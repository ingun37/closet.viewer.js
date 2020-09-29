const merge = require('merge');
const path = require('path');

var base = require('./webpack.config');

function resolve(dir) {
    return path.join(__dirname, '..', dir);
}


module.exports = merge.recursive(base, {
    entry: {
        main: ['babel-polyfill','./src/index.js',]
    },
    output: {
        libraryTarget: 'umd',
        filename: './closet.viewer.min.js'     
    },
});