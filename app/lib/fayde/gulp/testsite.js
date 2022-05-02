var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps'),
    connect = require('gulp-connect'),
    open = require('gulp-open');

module.exports = function (meta) {
    var scaffold = meta.scaffolds.filter(function (scaffold) {
        return scaffold.name === 'testsite';
    })[0];
    if (!scaffold)
        return;

    gulp.task('testsite-build', function () {
        return gulp.src(scaffold.src)
            .pipe(sourcemaps.init())
            .pipe(ts({
                target: 'ES5',
                module: 'amd',
                outDir: 'stress/.build/',
                pathFilter: {'testsite': ''}
            }))
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('testsite/.build/'))
            .pipe(connect.reload());
    });

    gulp.task('testsite', ['default', 'testsite-build'], function () {
        var options = {
            url: 'http://localhost:' + scaffold.port.toString()
        };
        gulp.src('testsite/index.html')
            .pipe(open('', options));

        connect.server({
            livereload: true,
            root: ['testsite', 'testsite/.build'],
            port: scaffold.port
        });

        gulp.watch('testsite/**/*.ts', ['testsite-build']);
        gulp.watch('testsite/.build/**/*', connect.reload);
    });
};