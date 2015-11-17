/**
 * ADDING BLOCKS TO PROJECT
 * ------------------------
 *
 * 1: Import the block module below
 * 2: Add the static variable name so that the block can be initialised on deserialization
 * 3: Add the block Name, ID & Description to "MenuJson" for it to appear in the menu
 *
 */

import {IBlock} from './Blocks/IBlock';

// SOURCE BLOCKS //
import {Granular} from './Blocks/Sources/Granular';
import {Microphone} from './Blocks/Sources/Microphone';
import {Noise} from './Blocks/Sources/Noise';
import {Recorder} from './Blocks/Sources/Recorder';
import {Sampler} from './Blocks/Sources/Sampler';
import {Soundcloud} from './Blocks/Sources/Soundcloud';
import {ToneSource} from './Blocks/Sources/ToneSource';
import {WaveGen} from './Blocks/Sources/WaveGen';

// EFFECTS BLOCKS //
import {AutoWah} from 'Blocks/Effects/Post/AutoWah';
import {BitCrusher} from 'Blocks/Effects/Post/BitCrusher';
import {Chomp} from 'Blocks/Effects/Post/Chomp';
import {Chopper} from 'Blocks/Effects/Post/Chopper';
import {Chorus} from 'Blocks/Effects/Post/Chorus';
import {Convolver} from 'Blocks/Effects/Post/ConvolutionReverb';
import {Delay} from 'Blocks/Effects/Post/Delay';
import {Distortion} from 'Blocks/Effects/Post/Distortion';
import {Envelope} from 'Blocks/Effects/Pre/Envelope';
import {EQ} from 'Blocks/Effects/Post/EQ';
import {Filter} from 'Blocks/Effects/Post/Filter';
import {LFO} from 'Blocks/Effects/Pre/LFO';
import {Panner} from 'Blocks/Effects/Post/Panner';
import {Phaser} from 'Blocks/Effects/Post/Phaser';
import {Pitch} from 'Blocks/Effects/Post/Pitch';
import {Reverb} from 'Blocks/Effects/Post/Reverb';
import {Scuzz} from 'Blocks/Effects/Pre/Scuzz';
import {Gain as Volume} from 'Blocks/Effects/Post/Gain';

// POWER BLOCKS //
import {Laser} from './Blocks/Power/Laser';
import {Momentary} from './Blocks/Power/Logic/Momentary';
import {ParticleEmitter} from './Blocks/Power/ParticleEmitter';
import {Power} from './Blocks/Power/Power';
import {Toggle} from './Blocks/Power/Logic/Toggle';
import {Void} from './Blocks/Power/Void';

// INTERACTION BLOCKS //
import {ComputerKeyboard} from 'Blocks/Interaction/ComputerKeyboard';
import {MIDIController} from 'Blocks/Interaction/MIDIController';

export class BlockCreator {

    // SOURCE BLOCKS //
    public static Granular = Granular;
    public static Microphone = Microphone;
    public static Noise = Noise;
    public static Recorder = Recorder;
    public static Sampler = Sampler;
    public static Soundcloud = Soundcloud;
    public static ToneSource = ToneSource;
    public static WaveGen = WaveGen;

    // EFFECTS BLOCKS //
    public static AutoWah = AutoWah;
    public static BitCrusher = BitCrusher;
    public static Chomp = Chomp;
    public static Chopper = Chopper;
    public static Chorus = Chorus;
    public static Convolver = Convolver;
    public static Delay = Delay;
    public static Distortion = Distortion;
    public static Envelope = Envelope;
    public static EQ = EQ;
    public static Filter = Filter;
    public static LFO = LFO;
    public static Panner = Panner;
    public static Phaser = Phaser;
    public static Pitch = Pitch;
    public static Reverb = Reverb;
    public static Scuzz = Scuzz;
    public static Volume = Volume;

        // POWER BLOCKS //
    public static Laser = Laser;
    public static Momentary = Momentary;
    public static ParticleEmitter = ParticleEmitter;
    public static Power = Power;
    public static Toggle = Toggle;
    public static Void = Void;

        // INTERACTION BLOCKS //
    public static ComputerKeyboard = ComputerKeyboard;
    public static MIDIController = MIDIController;

    // todo: store block names separately. use them in block.BlockName too
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
                        "name": "Toggle Power",
                        "id": Toggle,
                        "description": "Toggles energy for source blocks, particle emitters & lasers."
                    },
                    {
                        "name": "Void",
                        "id": Void,
                        "description": "Absorbs any laser beams or particles that touch it."
                    },
                    {
                        "name": "Momentary Power",
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

    public static GetBlock(type: string): IBlock {
        type = this.LostBlockCheck(type);
        var b = eval("new BlockCreator." + type + "()");
        b.Type = eval('BlockCreator.'+type);
        return b;
    }

    // BACKWARDS COMPATIBILITY //
    // PATCH CHANGED BLOCK NAMES //
    public static LostBlockCheck(type: string): string {
        if (("" + type) === "Gain") { // todo: coerce to string using .toString() or <String>?
            type = "Volume";
        }
        return type;
    }
}