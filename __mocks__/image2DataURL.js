const path = require('path');
const fs = require('fs');

module.exports = {
  process(src, filename, config, options) {
    const base64 = fs.readFileSync(filename, {encoding: 'base64'});
    const ext = path.extname(filename).slice(1);
    const fmt = `data:image/${ext};base64,` + base64;
    return `module.exports = '${fmt}'`;
  },
};