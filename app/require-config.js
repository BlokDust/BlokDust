var require = {
    baseUrl: "./",
    paths: {
        "text": "lib/requirejs-text/text",
        "Fayde": "lib/fayde/Fayde",
        "Utils": "lib/fayde.utils/Fayde.Utils",
        "Tone": "lib/Tone.js/Tone",
        "Tween": "lib/tween.ts/build/tween.min"
    },
    deps: [
        "text",
        "Fayde",
        "Utils",
        "Tone/core/Tone",
        "Tone/core/Master",
        "Tone/source/Oscillator",
        "Tone/component/LFO",
        "Tween"
    ],
    callback: function (
        text,
        Fayde,
        Utils,
        Tone,
        Master,
        Oscillator,
        LFO,
        Tween
        ) {
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
        },
        "Utils": {
            deps: ["Fayde"]
        }
    }
};