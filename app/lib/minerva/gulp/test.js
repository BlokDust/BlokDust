var path = require('path'),
    gulp = require('gulp'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps'),
    Server = require('karma').Server,
    runSequence = require('run-sequence').use(gulp);

module.exports = function (meta) {
    var scaffold = meta.scaffolds.filter(function (scaffold) {
        return scaffold.name === 'test';
    })[0];
    if (!scaffold)
        return;

    gulp.task('test-build', function () {
        return gulp.src(scaffold.src)
            .pipe(sourcemaps.init())
            .pipe(ts({
                target: 'ES5',
                declaration: true,
                pathFilter: {'test': ''}
            }))
            .pipe(sourcemaps.write('./', {sourceRoot: '/', debug: true}))
            .pipe(gulp.dest('test/.build'));
    });

    gulp.task('test-run', function (done) {
        new Server({
            configFile: path.normalize(path.join(__dirname, '..', 'karma.conf.js')),
            singleRun: true
        }, done).start();
    });

    gulp.task('test-watch', ['test'], function () {
        gulp.watch(['test/**/*.ts', '!test/lib/**/*.ts'], ['test-build']);
        gulp.watch(['dist/*', 'test/.build/**/*.js'], ['test-run']);
    });

    gulp.task('test', function () {
        return runSequence('test-build', 'test-run');
    });
};