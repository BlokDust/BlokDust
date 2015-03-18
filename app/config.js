require.config({
    baseUrl: "./",
    paths: {
        "text": "lib/requirejs-text/text",
        "App": "App",
        "PixelPalette": "lib/PixelPalette/dist/PixelPalette",
        "Tone": "lib/tone/Tone",
        "Recorderjs": "lib/RecorderJS",
        "jquery": "lib/jquery/dist/jquery",
        "fayde.drawing": "lib/fayde.drawing/dist/fayde.drawing",
        "fayde.transformer": "lib/fayde.transformer/dist/fayde.transformer",
        "fayde.utils": "lib/fayde.utils/dist/fayde.utils",
        "tween": "lib/tween.ts/build/tween.min",
        "exjs": "lib/exjs/dist/ex"
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
        }/*,
        "intersection": {
            "path": "lib/intersection/intersection.js"
        }*/,
        "jquery": {}
    }
});

require([
    "text",
    "text!config.json",
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
    "Recorderjs/recorder"/*,
    "intersection/intersection"*/
], function (text, config, App, PixelPalette, Tone, jquery) {
    window.PixelPalette = PixelPalette;
    window.Tone = Tone;
    window.$ = jquery;
    window.App = new App();
    window.App.Setup();
});