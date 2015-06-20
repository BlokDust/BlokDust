require.config({
    baseUrl: "./",
    paths: {
        "App": "App",
        "exjs": "lib/exjs/dist/ex",
        "fayde.drawing": "lib/fayde.drawing/dist/fayde.drawing",
        "fayde.transformer": "lib/fayde.transformer/dist/fayde.transformer",
        "fayde.utils": "lib/fayde.utils/dist/fayde.utils",
        "jquery": "lib/jquery/dist/jquery",
        "lzma": "lib/lzma/bin/lzma",
        "PixelPalette": "lib/PixelPalette/dist/PixelPalette",
        "Recorderjs": "lib/RecorderJS",
        "text": "lib/requirejs-text/text",
        "Tone": "lib/tone/Tone",
        "tween": "lib/tween.ts/build/tween.min"
    },
    shim: {
        "exjs": {
            "exports": "exjs",
            "path": "lib/exjs/dist/ex.min"
        },
        "fayde.utils": {
            "exports": "Fayde.Utils"
        },
        "fayde.drawing": {
            "exports": "Fayde.Drawing"
        },
        "fayde.transformer": {
            "exports": "Fayde.Transformer",
            "deps": [
                "fayde.utils",
                "tween"
            ]
        },
        "tween": {
            "exports": "TWEEN",
            "path": "lib/tween.ts/build/tween.min"
        },
        "tone": {
            "path": "lib/tone/build/Tone.js"
        },
        "pixelpalette": {},
        "RecorderJS": {
            "path": "lib/RecorderJS/recorder.js"
        },
        "jquery": {}
    }
});

require([
    "text",
    "text!Config.json",
    "App",
    "PixelPalette",
    "Tone/core/Tone",
    "jquery",
    "exjs",
    "fayde.drawing",
    "fayde.transformer",
    "fayde.utils",
    "tween",
    "Tone/core/Note",
    "Tone/core/Master",
    "Tone/core/Transport",
    "Tone/source/Microphone",
    "Tone/source/Player",
    "Tone/source/Oscillator",
    "Tone/source/Noise",
    "Tone/component/Envelope",
    "Tone/component/AmplitudeEnvelope",
    "Tone/component/MultibandEQ",
    "Tone/component/Filter",
    "Tone/component/LFO",
    "Tone/instrument/Sampler",
    "Tone/effect/PingPongDelay",
    "Tone/effect/Distortion",
    "Tone/effect/Chorus",
    "Tone/effect/Freeverb",
    "Tone/effect/Convolver",
    "Tone/effect/Phaser",
    "Tone/effect/BitCrusher",
    "Tone/effect/AutoWah",
    "Tone/effect/AutoPanner",
    "Recorderjs/recorder",
    "lzma"
], function (text, config, App, PixelPalette, Tone, jquery) {
    window.PixelPalette = PixelPalette;
    window.Tone = Tone;
    window.$ = jquery;
    window.App = new App(config);
    window.App.Setup();
});