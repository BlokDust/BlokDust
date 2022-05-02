var gulp = require('gulp');

module.exports = function (meta) {
    gulp.task('watch', ['default'], function () {
        gulp.watch('src/**/*.ts', ['default']);
    });
};