var path = require('path'),
    connect_livereload = require('connect-livereload');

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-exec');

    var ports = {
        server: 8000,
        livereload: 35353
    };

    var dirs = {
        app: 'app',
        build: 'app/.build',
        lib: 'app/lib'
    };

    function mount(connect, dir) {
        return connect.static(path.resolve(dir));
    }

    grunt.initConfig({
        ports: ports,
        dirs: dirs,
        typescript: {
            build: {
                src: [
                    '<%= dirs.app %>/**/*.ts',
                    '!<%= dirs.lib %>/**/*.ts',
                    'app/typings/*.ts',
                    'app/lib/tone/utils/TypeScript/Tone.d.ts',
                    'app/lib/fayde/dist/fayde.d.ts',
                    'app/lib/minerva/dist/minerva.d.ts',
                    'app/lib/nullstone/dist/nullstone.d.ts',
                    'app/lib/fayde.drawing/dist/fayde.drawing.d.ts',
                    'app/lib/fayde.transformer/dist/fayde.transformer.d.ts',
                    'app/lib/fayde.utils/dist/fayde.utils.d.ts',
                    'app/lib/tween.ts/src/Tween.d.ts'
                ],
                dest: dirs.build,
                options: {
                    basePath: dirs.app,
                    module: 'amd',
                    target: 'es5',
                    sourceMap: true
                }
            }
        },
        copy: {
            main: {
                files: [
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>/Assets/',
                        src: ['**'],
                        dest: '<%= dirs.build %>/Assets/'
                    }
                ]
            }
        },
        connect: {
            server: {
                options: {
                    port: ports.server,
                    base: dirs.app,
                    middleware: function (connect) {
                        return [
                            connect_livereload({ port: ports.livereload }),
                            mount(connect, dirs.build),
                            mount(connect, dirs.app)
                        ];
                    }
                }
            }
        },
        open: {
            serve: {
                path: 'http://localhost:<%= ports.server %>/default.html'
            }
        },
        watch: {
            src: {
                files: [
                    '<%= dirs.app %>/**/*.ts',
                    '!<%= dirs.lib %>/**/*.ts'
                ],
                tasks: ['typescript:build'],
                options: {
                    livereload: ports.livereload
                }
            },
            views: {
                files: [
                    '<%= dirs.app %>/**/*.fap',
                    '<%= dirs.app %>/**/*.fayde'
                ],
                options: {
                    livereload: ports.livereload
                }
            }
        },
        exec: {
            minify: {
                cmd: 'node app/lib/r.js/dist/r.js -o baseUrl=app/ mainConfigFile=app/require-config.js name=require-config optimize=none out=app/min.js'
            }
        }
    });

    grunt.registerTask('default', ['typescript:build', 'copy']);
    grunt.registerTask('serve', ['typescript:build', 'copy', 'connect', 'open', 'watch'])
};