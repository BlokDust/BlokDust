var Config = require('./gulpfile.config'),
    config = new Config(),
    del = require('del'),
    gulp = require('gulp'),
    merge = require('merge2'),
    requireDir = require('require-dir'),
    runSequence = require('run-sequence'),
    tasks = requireDir('./tasks'),
    ts = require('gulp-typescript');

gulp.task('clean:dist', function (cb) {
    del([
        config.dist + '/*'
    ], cb);
});

gulp.task('build', function() {

    var tsResult = gulp.src(['src/*.ts'])
        .pipe(ts({
            declarationFiles: true,
            noExternalResolve: true,
            noLib: false,
            module: 'commonjs',
            out: config.out
        }));

    return merge([
        tsResult.dts.pipe(gulp.dest(config.dist)),
        tsResult.js.pipe(gulp.dest(config.dist))
    ]);
});

gulp.task('default', function(cb) {
    runSequence('clean:dist', 'build', cb);
});