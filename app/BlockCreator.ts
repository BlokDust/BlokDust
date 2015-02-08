/**
 * Created by luketwyman on 08/02/2015.
 */

import ToneSource = require("./Blocks/Sources/ToneSource");
import Noise = require("./Blocks/Sources/Noise");
import Microphone = require("./Blocks/Sources/Microphone");
import Soundcloud = require("./Blocks/Sources/Soundcloud");
import Recorder = require("./Blocks/Sources/Recorder");

import AutoWah = require("./Blocks/Modifiers/AutoWah");
import BitCrusher = require("./Blocks/Modifiers/BitCrusher");
import Chomp = require("./Blocks/Modifiers/Chomp");
import Chopper = require("./Blocks/Modifiers/Chopper");
import Chorus = require("./Blocks/Modifiers/Chorus");
import ConvolutionReverb = require("./Blocks/Modifiers/ConvolutionReverb");
import Delay = require("./Blocks/Modifiers/Delay");
import Distortion = require("./Blocks/Modifiers/Distortion");
import Envelope = require("./Blocks/Modifiers/Envelope");
import EQ = require("./Blocks/Modifiers/EQ");
import Filter = require("./Blocks/Modifiers/Filter");
import Gain = require("./Blocks/Modifiers/Gain");
import LFO = require("./Blocks/Modifiers/LFO");
import Panner = require("./Blocks/Modifiers/Panner");
import Phaser = require("./Blocks/Modifiers/Phaser");
import PitchIncrease = require("./Blocks/Modifiers/PitchIncrease");
import Reverb = require("./Blocks/Modifiers/Reverb");
import Scuzz = require("./Blocks/Modifiers/Scuzz");

import ParticleEmitter = require("./Blocks/Sources/ParticleEmitter");

import Keyboard = require("./Blocks/Modifiers/Keyboard");



import BlocksSketch = require("./BlocksSketch");


class BlockCreator {

    public Sketch: BlocksSketch;
    public MenuJson;

    constructor(sketch: BlocksSketch) {

        this.Sketch = sketch;


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
                            "id": EQ
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
                            "id": PitchIncrease
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
                            "name": "Keyboard",
                            "id": Keyboard
                        }
                    ]
                }

            ]
        };

    }

}

export = BlockCreator;