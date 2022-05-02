var fs = require('fs'),
    meta = {
        name: 'minerva',
        buildfiles: [
            'typings/**/*.d.ts',
            'lib/perfex/dist/perfex.d.ts',
            'src/_Version.ts',
            'src/*.ts',
            'src/**/*.ts'
        ],
        scaffolds: []
    };

meta.scaffolds = [
    {
        name: 'test',
        symdirs: ['dist', 'src'],
        src: [
            'typings/*.d.ts',
            'test/**/*.ts',
            '!test/lib/**/*.ts',
            `dist/${meta.name}.d.ts`
        ]
    },
    {
        name: 'stress',
        symdirs: ['dist', 'src'],
        ignore: 'lib/qunit',
        src: [
            'typings/*.d.ts',
            'stress/**/*.ts',
            '!stress/lib/**/*.ts',
            `dist/${meta.name}.d.ts`
        ]
    }
];

fs.readdirSync('./gulp')
    .forEach(function (file) {
        require('./gulp/' + file)(meta);
    });