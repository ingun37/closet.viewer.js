const path = require('path');

var base = require('../webpack.config');

function resolve(dir) {
    return path.join(__dirname, '..', dir);
}
base.target = 'node'
base.entry = {
    ...base.entry,
    ...{
        'main': ['babel-polyfill','./src/viewer.js',]
    }
};
base.output = {
    ...base.output,
    ...{
        library: 'closet',
        libraryTarget: 'commonjs2',
        filename: './closet.viewer.js'
    }
};
base.optimization = {
    ...base.optimization,
    ...{ minimize: false }
};
base.module.rules.unshift({
    test: /\.js$/,
    loader: 'babel-loader',
    include: resolve('src'),
    options: {
        presets: ["env", "stage-2"],
    }
})
module.exports = base;