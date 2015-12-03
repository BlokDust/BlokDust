require.config({
    baseUrl: "./",
    paths: {
        "App": "App",
        "exjs": "lib/exjs/dist/ex",
        "extensions": "lib/extensions/dist/extensions",
        "fayde.drawing": "lib/fayde.drawing/dist/fayde.drawing",
        "intersection": "lib/intersection/intersection",
        "jquery": "lib/jquery/dist/jquery",
        "lzma": "lib/lzma/src/lzma",
        "PixelPalette": "lib/PixelPalette/dist/PixelPalette",
        "Recorderjs": "lib/RecorderJS",
        "text": "lib/requirejs-text/text",
        "Tone": "lib/tone/Tone",
        "tween": "lib/tween.ts/build/tween.min",
        "utils": "lib/utils/dist/utils"
    },
    shim: {
        "exjs": {
            "exports": "exjs",
            "path": "lib/exjs/dist/ex.min"
        },
        "fayde.drawing": {
            "exports": "Fayde.Drawing"
        },
        "tween": {
            "exports": "TWEEN",
            "path": "lib/tween.ts/build/tween.min"
        },
        "tone": {
            "path": "lib/tone/build/Tone.js"
        },
        "utils": {
            "exports": "Utils"
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
    "intersection",
    "lzma",
    "Recorderjs/recorder",
    "Tone/component/AmplitudeEnvelope",
    "Tone/component/Envelope",
    "Tone/component/Filter",
    "Tone/component/LFO",
    "Tone/component/EQMultiband",
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
    "Tone/effect/Tremolo",
    "Tone/instrument/Simpler",
    "Tone/source/Microphone",
    "Tone/source/Noise",
    "Tone/source/Oscillator",
    "Tone/source/Player",
    "Tone/component/Meter",
    "Tone/component/Mono",
    "tween",
    "utils"
], function (text, config, App, PixelPalette, Tone, jquery) {
    window.PixelPalette = PixelPalette;
    window.Tone = Tone;
    window.$ = jquery;

    $(document).ready(function() {
        window.App = new App.default(config);
        window.App.Setup();
    });
});