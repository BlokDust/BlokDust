var argv = require('yargs').argv,
    bump = require('gulp-bump'),
    exec = require('child_process').exec,
    gulp = require('gulp');

gulp.task('bump', function(){
    var bumpType = argv.type || 'patch'; // major.minor.patch

    gulp.src(['./bower.json', './package.json'])
        .pipe(bump({type: bumpType}))
        .pipe(gulp.dest('./'));
});

// requires global gulp-cli
gulp.task('bump:minor', function(cb){
    exec('gulp bump --type minor', function (err, stdout, stderr) {
        cb();
    });
});

// requires global gulp-cli
gulp.task('bump:major', function(cb){
    exec('gulp bump --type major', function (err, stdout, stderr) {
        cb();
    });
});