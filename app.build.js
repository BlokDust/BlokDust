({
    baseUrl: "dist/",
    paths: {
        requireLib: 'lib/requirejs/require'
    },
    mainConfigFile: "dist/require-config.js",
    name: "require-config",
    out: "dist/App.min.js",
    include: ["requireLib"],
    uglify: {
        no_mangle: true
    }
})