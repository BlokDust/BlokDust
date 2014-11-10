var require = {
    baseUrl: "./",
    paths: {
        "text": "lib/requirejs-text/text",
        "Fayde": "lib/fayde/Fayde",
        "PixelPalette": "lib/pixelpalette/dist/PixelPalette",
        "Tone": "lib/tone/Tone"
    },
    deps: [
        "text",
        "Fayde",
        "PixelPalette",
        "Tone/core/Tone",
        "Tone/core/Master",
        "Tone/source/Oscillator",
        "Tone/source/Noise",
        "Tone/component/LFO",
        "Tone/component/Envelope",
        "Tone/effect/PingPongDelay"
    ],
    callback: function (
        text,
        Fayde,
        PixelPalette,
        Tone
        ) {
        window.PixelPalette = PixelPalette;
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