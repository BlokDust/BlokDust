var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    runSequence = require('run-sequence'),
    merge = require('merge2');

module.exports = function (meta) {
    gulp.task('dist-build', function () {
        var tsResult = gulp.src(meta.src)
            .pipe(sourcemaps.init())
            .pipe(ts({
                target: 'ES5',
                out: meta.name + '.js',
                declaration: true,
                removeComments: true
            }));

        return merge([
            tsResult.dts.pipe(gulp.dest('./dist')),
            tsResult.js
                .pipe(uglify())
                .pipe(rename(meta.name + '.min.js'))
                .pipe(sourcemaps.write('./'))
                .pipe(gulp.dest('dist'))
        ]);
    });

    gulp.task('dist', function (callback) {
        runSequence('bump', ['default', 'dist-build'], callback);
    });
    gulp.task('dist-minor', function (callback) {
        runSequence('bump-minor', ['default', 'dist-build'], callback);
    });
    gulp.task('dist-major', function (callback) {
        runSequence('bump-major', ['default', 'dist-build'], callback);
    });
};