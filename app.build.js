({
    baseUrl: "dist/",
    paths: {
        requireLib: 'lib/r.js/require'
    },
    mainConfigFile: "dist/require-config.js",
    name: "require-config",
    out: "dist/App.js",
    optimize: "none",
    preserveLicenseComments: false,
    include: ["requireLib"],
    uglify: {
        no_mangle: true
    }
})