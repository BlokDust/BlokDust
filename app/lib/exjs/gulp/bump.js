var gulp = require('gulp'),
    bump = require('gulp-bump'),
    versionts = require('version-ts');

module.exports = function (meta) {
    gulp.task('version', function () {
        return versionts.apply();
    });

    gulp.task('bump', function () {
        return gulp.src(['./bower.json', './package.json'])
            .pipe(bump())
            .pipe(gulp.dest('./'))
            .on('end', function () {
                versionts.apply();
            });
    });

    gulp.task('bump-minor', function () {
        return gulp.src(['./bower.json', './package.json'])
            .pipe(bump({type: 'minor'}))
            .pipe(gulp.dest('./'))
            .on('end', function () {
                versionts.apply();
            });
    });

    gulp.task('bump-major', function () {
        return gulp.src(['./bower.json', './package.json'])
            .pipe(bump({type: 'major'}))
            .pipe(gulp.dest('./'))
            .on('end', function () {
                versionts.apply();
            });
    });
};