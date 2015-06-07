var path = require('path'),
    connect_livereload = require('connect-livereload');

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-clean');
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
        dist: 'dist',
        lib: 'app/lib',
        typings: 'app/typings'
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
                    '<%= dirs.typings %>/*.ts',
                    '<%= dirs.lib %>/tone/utils/TypeScript/Tone.d.ts',
                    '<%= dirs.lib %>/fayde/dist/fayde.d.ts',
                    '<%= dirs.lib %>/minerva/dist/minerva.d.ts',
                    '<%= dirs.lib %>/nullstone/dist/nullstone.d.ts',
                    '<%= dirs.lib %>/fayde.drawing/dist/fayde.drawing.d.ts',
                    '<%= dirs.lib %>/fayde.transformer/dist/fayde.transformer.d.ts',
                    '<%= dirs.lib %>/fayde.utils/dist/fayde.utils.d.ts',
                    '<%= dirs.lib %>/tween.ts/src/Tween.d.ts'
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

        clean: {
            dist : ['<%= dirs.dist %>/**'],
            minified : [
                '<%= dirs.dist %>/*',
                '!<%= dirs.dist %>/Assets',
                '!<%= dirs.dist %>/lib',
                '!<%= dirs.dist %>/App.min.js',
                '!<%= dirs.dist %>/config.json']
        },

        copy: {
            assets: {
                files: [
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>/Assets/',
                        src: ['**'],
                        dest: '<%= dirs.build %>/Assets/'
                    }
                ]
            },
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>',
                        src: ['require-config.js'],
                        dest: '<%= dirs.dist %>/'
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>/lib',
                        src: ['**'],
                        dest: '<%= dirs.dist %>/lib/'
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.build %>',
                        src: ['**'],
                        dest: '<%= dirs.dist %>/'
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>',
                        src: ['config.json'],
                        dest: '<%= dirs.dist %>/'
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
                //cmd: 'node app/lib/r.js/dist/r.js -o baseUrl=app/ mainConfigFile=app/require-config.js name=require-config optimize=none out=app/min.js'
                cmd: 'node app/lib/r.js/dist/r.js -o app.build.js'
            }
        }
    });

    grunt.registerTask('default', ['typescript:build', 'copy:assets']);
    grunt.registerTask('serve', ['typescript:build', 'copy:assets', 'connect', 'open', 'watch']);
    grunt.registerTask('dist', ['clean:dist', 'copy:dist', 'exec:minify', 'clean:minified']);
};