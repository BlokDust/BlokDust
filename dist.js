var path = require('path');
var _ = require('lodash');
//var glob = require('glob');
//var globArray = require('glob-array');

/*

 copy

 ./app/require-config.js
 ./app/lib
 ./build/*

 to

 ./dist

 minify using r.js

*/

module.exports = function (grunt) {

    var options;

    grunt.registerMultiTask('dist', '', function () {

        options = this.data.options;

        grunt.file.delete(options.dest);

        copyFiles(['./app/require-config.js', './app/.build/*'], options.dest);
        copyFiles('./app/lib/*', options.dest + '/lib');
    });

    function copyFiles(globs, dest, renameFunc) {

        if (!_.isArray(globs)){
            globs = [globs];
        }

        _.each(globs, function(glob) {
            var files = grunt.file.expand(glob);

            _.each(files, function(src) {
                var fileName, fileDest;

                if (renameFunc){
                    fileDest = renameFunc(src, dest);
                } else {
                    fileName = path.basename(src);
                    fileDest = path.join(dest, fileName);
                }

                grunt.file.copy(src, fileDest);
            });
        });
    }
};