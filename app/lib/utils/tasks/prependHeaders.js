var c = require('../gulpfile.config');
var config = new c();
var gulp = require('gulp');
var utils = require('gulp-utils');

gulp.task('prependHeaders', function(cb){
    Promise.all([
        utils.prependHeader(config.header, config.dist + '/' + config.dtsOut, config.dist),
        utils.prependHeader(config.header, config.dist + '/' + config.jsOut, config.dist),
        utils.prependHeader(config.header, config.dist + '/' + config.name + '.min.js', config.dist)
    ]).then(function(){
        cb();
    });
});