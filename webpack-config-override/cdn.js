const path = require('path');

var base = require('../webpack.config');

function resolve(dir) {
    return path.join(__dirname, '..', dir);
}

base.entry = {
    ...base.entry,
    ...{
        'main': ['babel-polyfill','./src/index.js',]
    }
};
base.output = {
    ...base.output,
    ...{
        libraryTarget: 'umd',
        filename: './closet.viewer.min.js'
    }
};
base.module.rules.unshift({
    test: /\.js$/,
    loader: 'babel-loader',
    include: resolve('src'),
    options: {
        presets: ["env", "es2017", "stage-2"]
    }
})
module.exports = base;