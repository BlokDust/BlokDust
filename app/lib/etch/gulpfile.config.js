var metadata = require('./package');

var GulpConfig = (function () {
    function GulpConfig() {
        this.name= metadata.name;
        this.dist = './dist';
        this.header = '// ' + metadata.name + ' v' + metadata.version + ' ' + metadata.homepage + '\n';
        this.jsOut = 'etch.js';
        this.dtsOut = 'etch.d.ts';
        this.build = './.build';
    }
    return GulpConfig;
})();

module.exports = GulpConfig;