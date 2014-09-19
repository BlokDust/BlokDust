var require = {
    baseUrl: "./",
    paths: {
        "text": "lib/requirejs-text/text",
        "Fayde": "lib/Fayde/Fayde",
        "Tone": "lib/Tone.js/Tone"
    },
    deps: ["text", "Fayde", "Tone/core/Tone", "Tone/core/Master", "Tone/source/Oscillator", "Tone/component/LFO"],
    callback: function (text, Fayde, Tone, Master, Oscillator, LFO) {
        window.Tone = Tone;

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


//var require = {
//    baseUrl: "./",
//    paths: {
//        "text": "lib/requirejs-text/text",
//        "Fayde": "lib/Fayde/Fayde"
//    },
//    deps: ["text", "Fayde"],
//    callback: function (text, Fayde) {
//        Fayde.LoadConfigJson(function (config, err) {
//            if (err)
//                console.warn('Could not load fayde configuration file.', err);
//            Fayde.Run();
//        });
//    },
//    shim: {
//        "Fayde": {
//            exports: "Fayde",
//            deps: ["text"]
//        }
//    }
//};