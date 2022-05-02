
var metadata = require('./package');

var GulpConfig = (function () {
    function GulpConfig() {
        this.name = metadata.name;
        this.dist = './dist';
        this.header = '// ' + metadata.name + ' v' + metadata.version + ' ' + metadata.homepage + '\n';
        this.jsOut = this.name + '.js';
        this.test = 'test/test.js';
        this.tsSrc = ['src/*.ts', 'typings/*.ts', '!test'];
        this.tsConfig = {
            declarationFiles: false,
            noExternalResolve: true,
            noLib: false,
            module: 'commonjs',
            out: this.jsOut
        };
        this.typingsDir = './typings';
    }
    return GulpConfig;
})();

module.exports = GulpConfig;