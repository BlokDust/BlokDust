/**
 * ADDING BLOCKS TO PROJECT
 * ------------------------
 *
 * 1: Import the block module below
 * 2: Add the block Name, ID & Description to "MenuJson" for it to appear in the menu
 *
 */

import IBlock = require("./Blocks/IBlock");

// SOURCE BLOCKS //
import ToneSource = require("./Blocks/Sources/ToneSource");
import Noise = require("./Blocks/Sources/Noise");
import Microphone = require("./Blocks/Sources/Microphone");
import Sampler = require("./Blocks/Sources/Sampler");
import Soundcloud = require("./Blocks/Sources/Soundcloud");
import Granular = require("./Blocks/Sources/Granular");
import Recorder = require("./Blocks/Sources/Recorder");
import WaveGen = require("./Blocks/Sources/WaveGen");

// EFFECTS BLOCKS //
import AutoWah = require("Blocks/Effects/Post/AutoWah");
import BitCrusher = require("Blocks/Effects/Post/BitCrusher");
import Chomp = require("Blocks/Effects/Post/Chomp");
import Chopper = require("Blocks/Effects/Post/Chopper");
import Chorus = require("Blocks/Effects/Post/Chorus");
import Convolver = require("Blocks/Effects/Post/ConvolutionReverb");
import Delay = require("Blocks/Effects/Post/Delay");
import Distortion = require("Blocks/Effects/Post/Distortion");
import Envelope = require("Blocks/Effects/Pre/Envelope");
import EQ = require("Blocks/Effects/Post/EQ");
import Filter = require("Blocks/Effects/Post/Filter");
import Volume = require("Blocks/Effects/Post/Gain");
import LFO = require("Blocks/Effects/Pre/LFO");
import Panner = require("Blocks/Effects/Post/Panner");
import Phaser = require("Blocks/Effects/Post/Phaser");
import Pitch = require("Blocks/Effects/Post/Pitch");
import Reverb = require("Blocks/Effects/Post/Reverb");
import Scuzz = require("Blocks/Effects/Pre/Scuzz");

// POWER BLOCKS //
import ParticleEmitter = require("./Blocks/Power/ParticleEmitter");
import Power = require("./Blocks/Power/Power");
import Toggle = require("./Blocks/Power/Logic/Toggle");
import Momentary = require("./Blocks/Power/Logic/Momentary");
import Laser = require("./Blocks/Power/Laser");
import Void = require("./Blocks/Power/Void");

// INTERACTION BLOCKS //
import ComputerKeyboard = require("Blocks/Interaction/ComputerKeyboard");
import MIDIController = require("Blocks/Interaction/MIDIController");

class BlockCreator {

    public static MenuJson: any = {
        "categories": [
            {
                "name": "Source",
                "items": [
                    {
                        "name": "Tone",
                        "id": ToneSource,
                        "description": "A single oscillator. Creates a waveform used as the basis of most synths."
                    },
                    {
                        "name": "Noise",
                        "id": Noise,
                        "description": "A noise generator with 'White', 'Brown' and 'Pink' waveform types."
                    },
                    {
                        "name": "Microphone",
                        "id": Microphone,
                        "description": "Captures sound from your device's microphone input. Connect to a Power source & avoid feedback by using headphones."
                    },
                    {
                        "name": "SoundCloud",
                        "id": Soundcloud,
                        "description": "A sampler player loaded with a SoundCloud track of your choice."
                    },
                    {
                        "name": "Sampler",
                        "id": Sampler,
                        "description": "A sampler player loaded with an audio file from your device."
                    },
                    {
                        "name": "Granular",
                        "id": Granular,
                        "description": "It takes a SoundCloud sample of your choice and chops it into tiny pieces and uses that as a sound source."
                    },
                    {
                        "name": "Recorder",
                        "id": Recorder,
                        "description": "Records the master output and then works as a sample player like the SoundCloud Block."
                    },
                    {
                        "name": "WaveGen",
                        "id": WaveGen,
                        "description": "Procedurally generates a new audio sample, for creating unique textures or arpeggiated loops."
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
                        "id": Convolver,
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
                        "id": Filter,
                        "description": "A 'peaking' filter used for boosting or suppressing frequencies. Can connect to any source block."
                    },
                    {
                        "name": "LFO",
                        "id": LFO,
                        "description": "Modulates pitch, Can connect to Tone blocks."
                    },
                    {
                        "name": "Phaser",
                        "id": Phaser,
                        "description": "Creates a sweeping phase effect. Can connect to any source block."
                    },
                    {
                        "name": "Pitch",
                        "id": Pitch,
                        "description": "Shift the pitch of any source block."
                    },
                    {
                        "name": "Reverb",
                        "id": Reverb,
                        "description": "A digital reverb based on the 'Freeverb'. Can connect to any source block."
                    },
                    {
                        "name": "Scuzz",
                        "id": Scuzz,
                        "description": "No idea. Can connect to Tone Blocks."
                    },
                    {
                        "name": "Volume",
                        "id": Volume,
                        "description": "Increase or decrease the volume. Can connect to any source block."
                    }
                ]
            },
            {
                "name": "Power",
                "items": [
                    {
                        "name": "Particle Emitter",
                        "id": ParticleEmitter,
                        "description": "Fires energy particles across the screen. When a particle hits a source block, that source is momentarily triggered."
                    },
                    {
                        "name": "Power",
                        "id": Power,
                        "description": "Creates energy for source blocks, particle emitters & lasers. This allows them to be constantly on."
                    },
                    {
                        "name": "Toggle Switch",
                        "id": Toggle,
                        "description": "Toggles energy for source blocks, particle emitters & lasers."
                    },
                    {
                        "name": "Void",
                        "id": Void,
                        "description": "Absorbs any laser beams or particles that touch it."
                    },
                    {
                        "name": "Momentary Switch",
                        "id": Momentary,
                        "description": "Momentary energy for source blocks, particle emitters & lasers."
                    },
                    {
                        "name": "Laser",
                        "id": Laser,
                        "description": "Fires a super cool laser beam that gives energy to anything it touches."
                    }
                ]
            },
            {
                "name": "Interaction",
                "items": [
                    {
                        "name": "Computer Keyboard",
                        "id": ComputerKeyboard,
                        "description": "Control a source using your computer keys."
                    },
                    {
                        "name": "MIDI Controller",
                        "id": MIDIController,
                        "description": "Control source blocks using a connected USB MIDI device."
                    }
                ]
            }
        ]
    };

    public static GetBlock(type: any): IBlock {
        type = this.LostBlockCheck(type);
        var b = eval("new " + type + "()");
        b.Type = eval(type);
        return b;
    }

    // BACKWARDS COMPATIBILITY //
    // PATCH CHANGED BLOCK NAMES //
    public static LostBlockCheck(type: any) {
        if (("" + type) === "Gain") { // todo: coerce to string using .toString() or <String>?
            type = "Volume";
        }
        return type;
    }

}

export = BlockCreator;