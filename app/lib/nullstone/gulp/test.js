var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps'),
    qunit = require('gulp-qunit'),
    runSequence = require('run-sequence').use(gulp);

module.exports = function (meta) {
    var scaffold = meta.getScaffold('test');
    if (!scaffold)
        return;

    gulp.task('test-build', function () {
        return gulp.src(scaffold.getSrc())
            .pipe(sourcemaps.init())
            .pipe(ts({
                target: 'ES5',
                declaration: true,
                pathFilter: {'test': ''}
            }))
            .pipe(sourcemaps.write('./', {sourceRoot: '/', debug: true}))
            .pipe(gulp.dest('test/.build'));
    });

    gulp.task('test-run', function () {
        return gulp.src('test/tests.html')
            .pipe(qunit());
    });

    gulp.task('test-watch', ['test'], function () {
        gulp.watch(['test/**/*.ts', '!test/lib/**/*.ts'], ['test-build']);
        gulp.watch(['dist/*', 'test/.build/**/*.js'], ['test-run']);
    });

    gulp.task('test', function () {
        return runSequence('test-build', 'test-run');
    });
};