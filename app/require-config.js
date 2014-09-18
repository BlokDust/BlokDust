var require = {
    baseUrl: "./",
    paths: {
        "text": "lib/requirejs-text/text",
        "Fayde": "lib/Fayde/Fayde"
    },
    deps: ["text", "Fayde"],
    callback: function (text, Fayde) {
        Fayde.LoadConfigJson(function (config, err) {
            if (err)
                console.warn('Could not load fayde configuration file.', err);
            Fayde.Run();
        });
    },
    shim: {
        "Fayde": {
            exports: "Fayde",
            deps: ["text"]
        }
    }
};