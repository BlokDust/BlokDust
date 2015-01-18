var path = require('path'),
    connect_livereload = require('connect-livereload'),
    gunify = require('grunt-fayde-unify');

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-open');
    var unify = gunify(grunt);

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
                    '!<%= dirs.lib %>/**/*.ts'
                ].concat(unify.typings()),
                dest: dirs.build,
                options: {
                    basePath: dirs.app,
                    module: 'amd',
                    target: 'es5',
                    sourceMap: true
                }
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
        }
    });

    grunt.registerTask('default', ['typescript:build']);
    grunt.registerTask('serve', ['typescript:build', 'connect', 'open', 'watch'])
};