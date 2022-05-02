var gulp = require('gulp'),
    del = require('del'),
    vfs = require('vinyl-fs'),
    runSequence = require('run-sequence').use(gulp),
    bower = require('gulp-bower'),
    path = require('path'),
    glob = require('glob');

module.exports = function (meta) {
    gulp.task('clean', function (cb) {
        del([
            './lib',
            './test/lib',
            './stress/lib'
        ], cb);
    });

    gulp.task('update-libs', function () {
        return bower()
            .pipe(gulp.dest('lib'));
    });

    function createSymlinkTask(scaffold) {
        gulp.task(`symlink-${scaffold.name}-libs`, () => {
            var libs = glob.sync("lib/*", !scaffold.ignore ? undefined : {ignore: scaffold.ignore});
            var dest = path.resolve(path.join(scaffold.name, 'lib'));
            return vfs.src(libs).pipe(vfs.symlink(dest));
        });
        gulp.task(`symlink-${scaffold.name}-local`, () => {
            var dirs = scaffold.symdirs || [];
            var dest = path.resolve(path.join(scaffold.name, 'lib', meta.name));
            return vfs.src(dirs).pipe(vfs.symlink(dest));
        });

        gulp.task(`symlink-${scaffold.name}`, () => {
            return runSequence(`symlink-${scaffold.name}-libs`, `symlink-${scaffold.name}-local`);
        });
    }

    meta.scaffolds.forEach(createSymlinkTask);
    gulp.task('reset', function () {
        return runSequence('clean', 'update-libs', meta.scaffolds.map(function (scaffold) {
            return `symlink-${scaffold.name}`;
        }));
    });
};