var c = require('../gulpfile.config');
var config = new c();
var gulp = require('gulp');
var utils = require('gulp-utils');

gulp.task('minify', function(cb){
    Promise.all([
        utils.minify(config.dist + '/' + config.jsOut, config.dist)
    ]).then(function(){
        cb();
    });
});