require.config({
    baseUrl: "./",
    paths: {
        "App": "App",
        "exjs": "lib/exjs/dist/ex",
        "extensions": "lib/extensions/dist/extensions",
        "fayde.drawing": "lib/fayde.drawing/dist/fayde.drawing",
        "fayde.transformer": "lib/fayde.transformer/dist/fayde.transformer",
        "fayde.utils": "lib/fayde.utils/dist/fayde.utils",
        "intersection": "lib/intersection/intersection",
        "jquery": "lib/jquery/dist/jquery",
        "lzma": "lib/lzma/src/lzma",
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
    "extensions",
    "fayde.drawing",
    "fayde.transformer",
    "fayde.utils",
    "intersection",
    "lzma",
    "Recorderjs/recorder",
    "Tone/component/AmplitudeEnvelope",
    "Tone/component/Envelope",
    "Tone/component/Filter",
    "Tone/component/LFO",
    "Tone/component/MultibandEQ",
    "Tone/core/Master",
    "Tone/core/Note",
    "Tone/core/Transport",
    "Tone/effect/AutoPanner",
    "Tone/effect/AutoWah",
    "Tone/effect/BitCrusher",
    "Tone/effect/Chorus",
    "Tone/effect/Convolver",
    "Tone/effect/Distortion",
    "Tone/effect/Freeverb",
    "Tone/effect/Phaser",
    "Tone/effect/PingPongDelay",
    "Tone/instrument/Sampler",
    "Tone/source/Microphone",
    "Tone/source/Noise",
    "Tone/source/Oscillator",
    "Tone/source/Player",
    "tween"
], function (text, config, App, PixelPalette, Tone, jquery) {
    window.PixelPalette = PixelPalette;
    window.Tone = Tone;
    window.$ = jquery;

    $(document).ready(function() {
        window.App = new App(config);
        window.App.Setup();
    });
});