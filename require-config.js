require.config({
    baseUrl: "./",
    paths: {
        "App": "App",
        "etch": "lib/etch/dist/etch",
        "exjs": "lib/exjs/dist/ex",
        "extensions": "lib/extensions/dist/extensions",
        "intersection": "lib/intersection/intersection",
        "keycodes": "lib/key-codes/dist/key-codes",
        "lzma": "lib/lzma/src/lzma",
        "PixelPalette": "lib/pixelpalette/dist/PixelPalette",
        "Recorderjs": "lib/RecorderJS",
        "text": "lib/text/text",
        "Tone": "lib/tone/Tone",
        "utils": "lib/utils/dist/utils"
    },
    shim: {
        "exjs": {
            "exports": "exjs",
            "path": "lib/exjs/dist/ex.min"
        },
        "utils": {
            "exports": "Utils"
        },
        "pixelpalette": {},
        "RecorderJS": {
            "path": "lib/RecorderJS/recorder.js"
        }
    }
});

require([
    "text",
    "App",
    "text!config.json",
    "text!l10n.json",
    "PixelPalette",
    "Tone/core/Tone",
    "etch",
    "exjs",
    "extensions",
    "intersection",
    "keycodes",
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
    "Tone/effect/PitchShift",
    "Tone/instrument/Simpler",
    "Tone/source/Microphone",
    "Tone/source/Noise",
    "Tone/source/Oscillator",
    "Tone/component/Meter",
    "Tone/component/Mono",
    "utils"
], function (text, App, config, l10n, PixelPalette, Tone) {
    window.PixelPalette = PixelPalette;
    window.Tone = Tone;

    $(document).ready(function() {
        window.App = new App.default(config, l10n);
        window.App.Setup();
    });
});