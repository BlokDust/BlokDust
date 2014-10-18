var require = {
    baseUrl: "./",
    paths: {
        "text": "lib/requirejs-text/text",
        "Fayde": "lib/fayde/Fayde",
        "Tone": "lib/Tone.js/Tone",
        "pixel-palette": "lib/pixel-palette"
    },
    deps: [
        "text",
        "Fayde",
        "Tone/core/Tone",
        "Tone/core/Master",
        "Tone/source/Oscillator",
        "Tone/source/Noise",
        "Tone/component/LFO",
        "Tone/component/Envelope",
        "Tone/effect/PingPongDelay",
        "pixel-palette"
    ],
    callback: function (
        text,
        Fayde,
        Tone,
        pixel-palette,
        Master,
        Oscillator,
        LFO,
        PingPongDelay
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
        }
    }
};