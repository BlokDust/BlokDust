({
    baseUrl: "dist/",
    paths: {
        requireLib: 'lib/requirejs/require'
    },
    mainConfigFile: "dist/require-config.js",
    name: "require-config",
    out: "dist/App.js",
    include: ["requireLib"],
    uglify: {
        no_mangle: true
    }
})