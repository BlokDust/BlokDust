var gulp = require('gulp');

var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var insert = require('gulp-insert');
var tsc = require('gulp-typescript-compiler');
var browserify = require('gulp-browserify');

var metadata = require('./package');
var header = '// ' + metadata.name + ' v' + metadata.version + ' ' + metadata.homepage + '\n';

gulp.task('build', function () {
    return gulp.src(['src/*.ts', '!src/*.d.ts'])
    .pipe(tsc({
            module : 'amd',
            target: 'ES3',
            sourcemap: false,
            logErrors: true
        }))
    .pipe(browserify({
        transform: ['deamdify']
    }))
    .pipe(uglify())
    .pipe(insert.prepend(header))
    .pipe(rename('tween.min.js'))
    .pipe(gulp.dest('build'));
});

gulp.task('default', ['build']);
