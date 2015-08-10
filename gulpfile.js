var gulp = require('gulp');
var ts = require('gulp-typescript');

// test build time vs grunt
gulp.task('build:dev', function() {

    return gulp.src([
        'app/**/*.ts',
        '!app/lib/**/*.ts',
        'app/typings/*.ts'
    ]).pipe(ts({
        rootDir: 'app',
        module: 'amd',
        target: 'es5',
        sourceMap: true
    }));
});