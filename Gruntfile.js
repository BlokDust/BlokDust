var path = require('path'),
    connect_livereload = require('connect-livereload');
    version = require('./version');

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks('grunt-typescript');

    version(grunt);

    var ports = {
        server: 8000,
        livereload: 35353
    };

    var dirs = {
        app: 'app',
        build: 'app/.build',
        dist: 'dist',
        lib: 'app/lib',
        releases: 'releases',
        typings: 'app/typings'
    };
    var files = {
    }

    var packageJson;

    function refresh() {
        packageJson = grunt.file.readJSON("package.json");
        grunt.config.set('files.zip', path.join(dirs.releases, packageJson.version + ".zip"));
    }

    function mount(connect, dir) {
        return connect.static(path.resolve(dir));
    }

    refresh();

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
            dist : ['<%= dirs.dist %>/*'],
            minified : [
                '<%= dirs.dist %>/*',
                '!<%= dirs.dist %>/Assets',
                '!<%= dirs.dist %>/lib',
                '!<%= dirs.dist %>/img',
                '!<%= dirs.dist %>/App.min.js',
                '!<%= dirs.dist %>/config.json',
                '!<%= dirs.dist %>/default.html',
                '!<%= dirs.dist %>/styles.css']
        },

        replace: {
            minified: {
                src: ['<%= dirs.dist %>/default.html'],
                overwrite: true,
                replacements: [
                    {
                        from: 'src="lib/requirejs/require.js"',
                        to: 'src="App.min.js"'
                    },
                    {
                        from: '<script src="//localhost:35353/livereload.js"></script>',
                        to: ''
                    }
                ]
            }
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
                        cwd: '<%= dirs.app %>/img',
                        src: ['**'],
                        dest: '<%= dirs.dist %>/img/'
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
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>',
                        src: ['default.html'],
                        dest: '<%= dirs.dist %>/'
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>',
                        src: ['styles.css'],
                        dest: '<%= dirs.dist %>/'
                    }
                ]
            }
        },

        connect: {
            dev: {
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
            },
            dist: {
                options: {
                    port: ports.server,
                    base: dirs.dist,
                    keepalive: true,
                    middleware: function (connect) {
                        return [
                            mount(connect, dirs.dist)
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
                    '!<%= dirs.lib %>/**/*.ts',
                    'config.json'
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
                cmd: 'node app/lib/r.js/dist/r.js -o app.build.js'
            }
        },

        compress: {
            zip: {
                options: {
                    mode: "zip",
                    archive: "<%= files.zip %>",
                    level: 9
                },
                files: [
                    {
                        expand: true,
                        src: ["<%= dirs.dist %>/**"]
                    }
                ]
            }
        },

        version: {
            bump: {
            },
            apply: {
                src: './VersionTemplate.ts',
                dest: './app/_Version.ts'
            }
        }
    });

    grunt.registerTask('bump:patch', ['version:bump', 'version:apply']);
    grunt.registerTask('bump:minor', ['version:bump:minor', 'version:apply']);
    grunt.registerTask('bump:major', ['version:bump:major', 'version:apply']);
    grunt.registerTask('default', ['typescript:build', 'copy:assets']);
    grunt.registerTask('serve:dev', ['typescript:build', 'copy:assets', 'connect:dev', 'open', 'watch']);
    grunt.registerTask('serve:dist', ['connect:dist', 'open']);

    grunt.registerTask('dist', '', function() {

        grunt.task.run('bump:patch');

        refresh();

        grunt.task.run(
            'clean:dist',
            'copy:dist',
            'exec:minify',
            'clean:minified',
            'replace:minified'
        );
    });

    grunt.registerTask('release', '', function() {

        refresh();

        grunt.task.run(
            'compress:zip'
        );
    });

};