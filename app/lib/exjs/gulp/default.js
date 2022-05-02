var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps'),
    runSequence = require('run-sequence'),
    merge = require('merge2');

module.exports = function (meta) {
    gulp.task('build', function () {
        var tsResult = gulp.src(meta.files.src)
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
                .pipe(sourcemaps.write('./'))
                .pipe(gulp.dest('./dist'))
        ]);
    });

    gulp.task('build-es3', function () {
        var tsResult = gulp.src(meta.files.es3src)
            .pipe(sourcemaps.init())
            .pipe(ts({
                target: 'ES3',
                out: meta.name + '.es3.js',
                removeComments: true
            }));

        return merge([
            tsResult.dts.pipe(gulp.dest('./dist')),
            tsResult.js
                .pipe(sourcemaps.write('./'))
                .pipe(gulp.dest('./dist'))
        ]);
    });

    gulp.task('default', function (callback) {
        runSequence(['build', 'build-es3'], callback);
    });
};