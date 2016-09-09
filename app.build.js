({
    baseUrl: "dist/",
    paths: {
        requireLib: 'lib/r.js/require'
    },
    mainConfigFile: "dist/require-config.js",
    name: "require-config",
    out: "dist/App.js",

    /**
     * App minification. Excepts "none" & "uglify"
     */
    optimize: "uglify",

    preserveLicenseComments: false,
    include: ["requireLib"],

    /**
     * Uncomment no_mangle to stop mangling var names
     */
    uglify: {
        no_mangle: true
    }
})