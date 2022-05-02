
var metadata = require('./package');

var GulpConfig = (function () {
    function GulpConfig() {
        this.dist = './dist';
        this.header = '// ' + metadata.name + ' v' + metadata.version + ' ' + metadata.homepage + '\n';
        this.out = 'PixelPalette.js';
        this.standalone = 'PixelPalette';
    }
    return GulpConfig;
})();

module.exports = GulpConfig;