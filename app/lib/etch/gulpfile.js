var c = require('./gulpfile.config');
var concat = require('gulp-concat');
var config = new c();
var gulp = require('gulp');
var requireDir = require('require-dir');
var runSequence = require('run-sequence');
var tasks = requireDir('./tasks');

gulp.task('default', function(cb) {
    runSequence('build:dev', 'build:test', 'build:dist', cb);
});

//gulp.task('dist', function(cb) {
//    runSequence('build:dist', cb);
//});