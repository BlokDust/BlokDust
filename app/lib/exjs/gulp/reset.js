var gulp = require('gulp'),
    del = require('del'),
    symlink = require('gulp-symlink'),
    runSequence = require('run-sequence').use(gulp),
    bower = require('gulp-bower'),
    path = require('path'),
    glob = require('glob');

module.exports = function (meta) {
    gulp.task('clean', function (cb) {
        del([
            './lib',
            './test/lib'
        ], cb);
    });

    gulp.task('update-libs', function () {
        return bower()
            .pipe(gulp.dest('lib'));
    });

    gulp.task('symlink-testlibs', function () {
        var srcs = glob.sync("lib/*");
        var dests = srcs.map(function (src) {
            return path.join('test', 'lib', path.basename(src));
        });
        srcs.push('./dist');
        dests.push(path.join('test', 'lib', meta.name, 'dist'));

        srcs.push('./src');
        dests.push(path.join('test', 'lib', meta.name, 'src'));

        return gulp.src(srcs).pipe(symlink.relative(dests, {force: true}));
    });

    gulp.task('reset', function () {
        return runSequence('clean', 'update-libs', 'symlink-testlibs');
    });
};