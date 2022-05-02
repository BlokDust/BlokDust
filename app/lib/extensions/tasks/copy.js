var c = require('../gulpfile.config');
var config = new c();
var gulp = require('gulp');
var utils = require('gulp-utils');

gulp.task('copy:typings', function() {
    return gulp.src(config.typingsDir + '/' + config.name + '.d.ts').pipe(gulp.dest(config.dist));
});