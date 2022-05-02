
var metadata = require('./package');

var GulpConfig = (function () {
    function GulpConfig() {
        this.name = metadata.name;
        this.dist = './dist';
        this.header = '// ' + metadata.name + ' v' + metadata.version + ' ' + metadata.homepage + '\n';
        this.jsOut = this.name + '.js';
        this.tsSrc = ['src/*.ts', 'typings/*.ts', '!test'];
        this.tsConfig = {
            declarationFiles: true,
            noExternalResolve: true,
            module: 'amd',
            sortOutput: true,
            out: this.jsOut
        };
        this.browserifyConfig = {
            debug: false,
            transform: ['deamdify'],
            standalone: this.name
        };
        this.browserifyTarget = this.dist;
    }
    return GulpConfig;
})();

module.exports = GulpConfig;