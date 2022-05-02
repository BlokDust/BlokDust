var fs = require('fs'),
    path = require('path'),
    gulp = require('gulp'),
    glob = require('glob'),
    taskListing = require('gulp-task-listing'),
    typings = require('bower-typings'),
    name = 'nullstone',
    meta = {
        name: name,
        src: rel([
            'typings/*.d.ts',
            'src/_version.ts',
            'src/*.ts',
            'src/**/*.ts'
        ]),
        getScaffold: (name) => {
            return meta.scaffolds.filter(function (scaffold) {
                return scaffold.name === name;
            })[0];
        },
        scaffolds: [
            {
                name: 'test',
                symdirs: ['dist', 'src'],
                getSrc: () => {
                    return [
                        'typings/*.d.ts',
                        'test/**/*.ts',
                        '!test/lib/**/*.ts',
                        `dist/${name}.d.ts`
                    ].concat(typings())
                }
            },
            {
                name: 'stress',
                ignore: 'lib/qunit',
                port: 8002,
                symdirs: ['dist', 'src'],
                getSrc: () => {
                    return [
                        'typings/*.d.ts',
                        'stress/**/*.ts',
                        '!stress/lib/**/*.ts',
                        `dist/${name}.d.ts`
                    ].concat(typings())
                }
            }
        ]
    };

function rel(patterns) {
    return patterns
        .reduce((prev, cur) => prev.concat(glob.sync(cur)), [])
        .map(file => path.resolve(file));
}

gulp.task('help', taskListing);

fs.readdirSync('./gulp')
    .forEach(function (file) {
        require('./gulp/' + file)(meta);
    });