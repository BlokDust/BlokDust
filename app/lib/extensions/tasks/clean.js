var c = require('../gulpfile.config');
var config = new c();
var del = require('del');
var gulp = require('gulp');

gulp.task('clean:dist', function (cb) {
    del(config.dist + '/*', cb);
});