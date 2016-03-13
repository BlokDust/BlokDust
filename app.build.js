({
    baseUrl: "dist/",
    paths: {
        requireLib: 'lib/requirejs/require'
    },
    mainConfigFile: "dist/require-config.js",
    name: "require-config",
    out: "dist/App.js",
    preserveLicenseComments: false,
    include: ["requireLib"],
    uglify: {
        no_mangle: true
    }
})