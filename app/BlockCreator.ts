/**
 * ADDING BLOCKS TO PROJECT
 * ------------------------
 *
 * 1: Import the block module below
 * 2: Add the block Name, ID & Description to "MenuJson" for it to appear in the menu
 *
 */

// SOURCE BLOCKS //
import ToneSource = require("./Blocks/Sources/ToneSource");
import Noise = require("./Blocks/Sources/Noise");
import Microphone = require("./Blocks/Sources/Microphone");
import Soundcloud = require("./Blocks/Sources/Soundcloud");
import Granular = require("./Blocks/Sources/Granular");
import Recorder = require("./Blocks/Sources/Recorder");

// EFFECTS BLOCKS //
import AutoWah = require("Blocks/Effects/AutoWah");
import BitCrusher = require("Blocks/Effects/BitCrusher");
import Chomp = require("Blocks/Effects/Chomp");
import Chopper = require("Blocks/Effects/Chopper");
import Chorus = require("Blocks/Effects/Chorus");
import ConvolutionReverb = require("Blocks/Effects/ConvolutionReverb");
import Delay = require("Blocks/Effects/Delay");
import Distortion = require("Blocks/Effects/Distortion");
import Envelope = require("Blocks/Effects/Envelope");
import EQ = require("Blocks/Effects/EQ");
import Filter = require("Blocks/Effects/Filter");
import Gain = require("Blocks/Effects/Gain");
import LFO = require("Blocks/Effects/LFO");
import Panner = require("Blocks/Effects/Panner");
import Phaser = require("Blocks/Effects/Phaser");
import Pitch = require("Blocks/Effects/Pitch");
import Reverb = require("Blocks/Effects/Reverb");
import Scuzz = require("Blocks/Effects/Scuzz");

// POWER BLOCKS //
import ParticleEmitter = require("./Blocks/Power/ParticleEmitter");

// INTERACTION BLOCKS //
import KeyboardMono = require("Blocks/Interaction/KeyboardMono");
import KeyboardPoly = require("Blocks/Interaction/KeyboardPoly");

class BlockCreator {

    public MenuJson;

    constructor() {

        this.MenuJson =
        {
            "categories": [

                {
                    "name": "Source",
                    "items": [
                        {
                            "name": "Tone",
                            "id": ToneSource
                        },
                        {
                            "name": "Noise",
                            "id": Noise
                        },
                        {
                            "name": "Microphone",
                            "id": Microphone
                        },
                        {
                            "name": "SoundCloud",
                            "id": Soundcloud
                        },
                        {
                            "name": "Granular",
                            "id": Granular
                        },
                        {
                            "name": "Recorder",
                            "id": Recorder
                        }
                    ]
                },

                {
                    "name": "Effects",
                    "items": [
                        {
                            "name": "Autowah",
                            "id": AutoWah,
                            "description": "Creates a filter sweep in response to the volume of audio input when connected to any source block."
                        },
                        {
                            "name": "Bit Crusher",
                            "id": BitCrusher,
                            "description": "Creates distortion by reducing the audio resolution when connected to any source block."
                        },
                        {
                            "name": "Chomp",
                            "id": Chomp,
                            "description": "A randomised filter with adjustable rate & width. Can connect to any source block."
                        },
                        {
                            "name": "Chopper",
                            "id": Chopper,
                            "description": "Volume modulation with adjustable rate & depth. Can connect to any source block."
                        },
                        {
                            "name": "Chorus",
                            "id": Chorus,
                            "description": "Stereo chorus/flange. Creates a delayed & modulated copy of the audio. Can connect to any source block."
                        },
                        {
                            "name": "Convolution",
                            "id": ConvolutionReverb,
                            "description": "A reverb which simulates a physical space by using a recorded sample. Can connect to any source block."
                        },
                        {
                            "name": "Delay",
                            "id": Delay,
                            "description": "A 'ping-pong' delay with adjustable time & feedback. Can connect to any source block."
                        },
                        {
                            "name": "Distortion",
                            "id": Distortion,
                            "description": "A digital clipping distortion. Can connect to any source block."
                        },
                        {
                            "name": "Envelope",
                            "id": Envelope,
                            "description": "An ADSR envelope. Alters the volume of sound over time. Can connect to Tone and Noise source blocks."
                        },
                        {
                            "name": "EQ",
                            "id": EQ,
                            "description": "A 'parametric' EQ with 4 filters. Can connect to any source blocks."
                        },
                        {
                            "name": "Filter",
                            "id": Filter
                        },
                        {
                            "name": "Gain",
                            "id": Gain
                        },
                        {
                            "name": "LFO",
                            "id": LFO
                        },
                        {
                            "name": "Phaser",
                            "id": Phaser
                        },
                        {
                            "name": "Pitch",
                            "id": Pitch
                        },
                        {
                            "name": "Reverb",
                            "id": Reverb
                        },
                        {
                            "name": "Scuzz",
                            "id": Scuzz
                        }
                    ]
                },

                {
                    "name": "Power",
                    "items": [
                        {
                            "name": "Particle Emitter",
                            "id": ParticleEmitter
                        }
                    ]
                },

                {
                    "name": "Interaction",
                    "items": [
                        {
                            "name": "Mono Keyboard",
                            "id": KeyboardMono
                        },
                        {
                            "name": "Poly Keyboard",
                            "id": KeyboardPoly
                        }
                    ]
                }

            ]
        };

    }

}

export = BlockCreator;