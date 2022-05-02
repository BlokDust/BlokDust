var gulp = require('gulp'),
    del = require('del'),
    symlink = require('gulp-symlink'),
    runSequence = require('run-sequence').use(gulp),
    bower = require('gulp-bower'),
    path = require('path'),
    glob = require('glob');

module.exports = function (meta) {
    gulp.task('clean', function (cb) {
        var dirs = ['./lib'].concat(meta.scaffolds.map(function (sc) {
            return './' + sc.name + '/lib';
        }));
        del(dirs, cb);
    });

    gulp.task('update-libs', function () {
        return bower()
            .pipe(gulp.dest('lib'));
    });

    function createSymlinkTask(scaffold) {
        gulp.task('symlink-' + scaffold.name, function () {
            var srcs = glob.sync("lib/*", !scaffold.ignore ? undefined : {ignore: scaffold.ignore});
            var dests = srcs.map(function (src) {
                return path.join(scaffold.name, 'lib', path.basename(src));
            });

            for (var i = 0, dirs = scaffold.symdirs || []; i < dirs.length; i++) {
                srcs.push(path.resolve('./' + dirs[i]));
                dests.push(path.resolve(path.join(scaffold.name, 'lib', meta.name, dirs[i])));
            }

            return gulp.src(srcs).pipe(symlink.relative(dests, {force: true}));
        });
    }

    meta.scaffolds.forEach(createSymlinkTask);
    gulp.task('reset', function () {
        return runSequence('clean', 'update-libs', meta.scaffolds.map(function (scaffold) {
            return 'symlink-' + scaffold.name;
        }));
    });
};