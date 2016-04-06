var path = require('path'),
    connect_livereload = require('connect-livereload');
    version = require('./tasks/version');

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
    grunt.loadNpmTasks('grunt-sync');

    version(grunt);

    var ports = {
        serverDev: 8000,
        serverDist: 8001,
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
    };

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
                    '<%= dirs.typings %>/*.ts'
                ],
                dest: dirs.build,
                options: {
                    rootDir: dirs.app,
                    module: 'amd',
                    target: 'es5',
                    sourceMap: true
                }
            }
        },

        clean: {
            build : ['<%= dirs.build %>/*'],
            dist : ['<%= dirs.dist %>/*'],
            // remove every file that isn't needed in production
            minified: {
                files: [
                    {
                        // everything in dist/ except these
                        src: [
                            '<%= dirs.dist %>/*',
                            '!<%= dirs.dist %>/lib',
                            '!<%= dirs.dist %>/Assets',
                            '!<%= dirs.dist %>/favicon.ico',
                            '!<%= dirs.dist %>/img',
                            '!<%= dirs.dist %>/App.js',
                            '!<%= dirs.dist %>/config.json',
                            '!<%= dirs.dist %>/index.html',
                            '!<%= dirs.dist %>/maintenance.html',
                            '!<%= dirs.dist %>/l10n.json',
                            '!<%= dirs.dist %>/styles.css',
                            '!<%= dirs.dist %>/require-config.js'
                        ]
                    },
                    {
                        // every file in dist/lib/ except these
                        src: [
                            '<%= dirs.dist %>/lib/**',
                            '!<%= dirs.dist %>/lib/bower-webfontloader/webfont.js',
                            '!<%= dirs.dist %>/lib/etch/dist/etch.js',
                            '!<%= dirs.dist %>/lib/exjs/dist/ex.js',
                            '!<%= dirs.dist %>/lib/extensions/dist/extensions.js',
                            '!<%= dirs.dist %>/lib/intersection/intersection.js',
                            '!<%= dirs.dist %>/lib/jquery/dist/jquery.js',
                            '!<%= dirs.dist %>/lib/key-codes/dist/key-codes.js',
                            '!<%= dirs.dist %>/lib/lzma/src/lzma.js',
                            '!<%= dirs.dist %>/lib/lzma/src/lzma_worker.js',
                            '!<%= dirs.dist %>/lib/minerva/dist/minerva.min.js',
                            '!<%= dirs.dist %>/lib/minerva/dist/minerva.min.js.map',
                            '!<%= dirs.dist %>/lib/nullstone/dist/nullstone.min.js',
                            '!<%= dirs.dist %>/lib/nullstone/dist/nullstone.min.js.map',
                            '!<%= dirs.dist %>/lib/pixelpalette/dist/PixelPalette.js',
                            '!<%= dirs.dist %>/lib/r.js/require.js',
                            '!<%= dirs.dist %>/lib/RecorderJS/recorder.js',
                            '!<%= dirs.dist %>/lib/text/text.js',
                            '!<%= dirs.dist %>/lib/tone/**',
                            '!<%= dirs.dist %>/lib/tweenjs/src/Tween.js',
                            '!<%= dirs.dist %>/lib/utils/dist/utils.js'
                        ],
                        filter: 'isFile'
                    },
                    {
                        // every folder in dist/lib/ except these
                        src: [
                            '<%= dirs.dist %>/lib/*',
                            '!<%= dirs.dist %>/lib/bower-webfontloader/**',
                            '!<%= dirs.dist %>/lib/etch/**',
                            '!<%= dirs.dist %>/lib/exjs/**',
                            '!<%= dirs.dist %>/lib/extensions/**',
                            '!<%= dirs.dist %>/lib/intersection/**',
                            '!<%= dirs.dist %>/lib/jquery/**',
                            '!<%= dirs.dist %>/lib/key-codes/**',
                            '!<%= dirs.dist %>/lib/lzma/**',
                            '!<%= dirs.dist %>/lib/minerva/**',
                            '!<%= dirs.dist %>/lib/nullstone/**',
                            '!<%= dirs.dist %>/lib/pixelpalette/**',
                            '!<%= dirs.dist %>/lib/r.js/**',
                            '!<%= dirs.dist %>/lib/RecorderJS/**',
                            '!<%= dirs.dist %>/lib/text/**',
                            '!<%= dirs.dist %>/lib/tone/**',
                            '!<%= dirs.dist %>/lib/tweenjs/**',
                            '!<%= dirs.dist %>/lib/utils/**'
                        ]
                    }
                ]
            }
        },

        replace: {
            minified: {
                src: ['<%= dirs.dist %>/index.html'],
                overwrite: true,
                replacements: [
                    {
                        from: 'src="lib/r.js/require.js"',
                        to: 'src="App.js"'
                    },
                    {
                        from: '<script src="//localhost:35353/livereload.js"></script>',
                        to: ''
                    }
                ]
            },
            php: {
                src: ['<%= dirs.dist %>/index.html'],
                overwrite: true,
                replacements: [
                    {
                        from: '$title',
                        to: '<?php if(isset($_GET["t"])){ echo \': \' . htmlentities($_GET["t"], ENT_QUOTES, \'UTF-8\');} ?>'
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
                        src: ['l10n.json'],
                        dest: '<%= dirs.dist %>/'
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>',
                        src: ['index.html'],
                        dest: '<%= dirs.dist %>/'
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>',
                        src: ['maintenance.html'],
                        dest: '<%= dirs.dist %>/'
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>',
                        src: ['styles.css'],
                        dest: '<%= dirs.dist %>/'
                    },
                    {
                        expand: true,
                        cwd: '<%= dirs.app %>',
                        src: ['favicon.ico'],
                        dest: '<%= dirs.dist %>/'
                    }
                ]
            }
        },

        connect: {
            dev: {
                options: {
                    port: ports.serverDev,
                    base: dirs.app,
                    keepalive: true,
                    middleware: function (connect) {
                        return [
                            //connect_livereload({ port: ports.livereload }),
                            mount(connect, dirs.build),
                            mount(connect, dirs.app)
                        ];
                    }
                }
            },
            livereload: {
                options: {
                    port: ports.serverDev,
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
                    port: ports.serverDist,
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
                path: 'http://localhost:<%= ports.server %>/index.html'
            }
        },

        // Please leave this in for Luke P. He uses watch:dev instead of serve:dev
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
            }
        },

        exec: {
            minify: {
                cmd: 'node app/lib/r.js/dist/r.js -o app.build.js'
                // uncomment if you want to test an unminified dist build
                //cmd: 'node app/lib/r.js/dist/r.js -o app.build.js optimize=none'
            }//,
            //dist: {
            //    cmd: 'git subtree push --prefix dist origin dist'
            //}
        },

        compress: {
            zip: {
                options: {
                    mode: 'zip',
                    archive: '<%= dirs.dist %>.zip',
                    level: 9
                },
                files: [
                    {
                        expand: true,
                        cwd: '<%= dirs.dist %>/',
                        src: ['**']
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
        },

        sync: {
            bowerComponents: {
                files: [
                    {
                        // all files that need to be copied from /lib to /src/typings post bower install
                        cwd: '<%= dirs.lib %>',
                        expand: true,
                        flatten: true,
                        src: [
                            'etch/dist/etch.d.ts',
                            'extensions/typings/extensions.d.ts',
                            'key-codes/dist/key-codes.d.ts',
                            'minerva/dist/minerva.d.ts',
                            'nullstone/dist/nullstone.d.ts',
                            'tone/utils/TypeScript/Tone.d.ts',
                            'utils/dist/utils.d.ts'
                        ],
                        dest: '<%= dirs.typings %>'
                    }
                ]
            }
        }
    });

    grunt.registerTask('default', ['clean:build', 'typescript:build', 'copy:assets']);
    grunt.registerTask('bump:patch', ['version:bump', 'version:apply']);
    grunt.registerTask('bump:minor', ['version:bump:minor', 'version:apply']);
    grunt.registerTask('bump:major', ['version:bump:major', 'version:apply']);
    grunt.registerTask('serve:dev', ['default', 'connect:dev', 'open']);
    grunt.registerTask('watch:dev', ['default', 'connect:livereload', 'watch']);
    grunt.registerTask('serve:dist', ['connect:dist', 'open']);

    grunt.registerTask('dist', '', function() {

        //grunt.task.run('bump:patch');

        refresh();

        grunt.task.run(
            'clean:dist',
            'copy:dist',
            'exec:minify',
            'clean:minified',
            'replace:minified',
            'replace:php',
            'compress:zip'
        );
    });

};