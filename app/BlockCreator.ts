/**
 * ADDING BLOCKS TO PROJECT
 * ------------------------
 *
 * 1: Import the block module below
 * 2: Add the variable name so that the block can be initialised on deserialization
 * 3: Add the block Name, ID & Description to "MenuJson" for it to appear in the menu
 *
 */

import {IBlock} from './Blocks/IBlock';

// SOURCE BLOCKS //
import {Granular} from './Blocks/Sources/Granular';
import {Microphone} from './Blocks/Sources/Microphone';
import {Noise} from './Blocks/Sources/Noise';
import {Recorder} from './Blocks/Sources/Recorder';
//import {Sampler} from './Blocks/Sources/Sampler';
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
import {Gain as Volume} from 'Blocks/Effects/Post/Gain';
import {Vibrato} from 'Blocks/Effects/Pre/Vibrato';
import {Phaser} from 'Blocks/Effects/Post/Phaser';
import {Pitch as PitchShifter} from 'Blocks/Effects/Post/Pitch';
import {Reverb} from 'Blocks/Effects/Post/Reverb';
import {Scuzz} from 'Blocks/Effects/Pre/Scuzz';

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

import {IApp} from "./IApp";

declare var App: IApp;

export class BlockCreator {

    // SOURCE BLOCKS //
    public Granular = Granular;
    public Microphone = Microphone;
    public Noise = Noise;
    public Recorder = Recorder;
    //public Sampler = Sampler;
    public Soundcloud = Soundcloud;
    public ToneSource = ToneSource;
    public WaveGen = WaveGen;

    // EFFECTS BLOCKS //
    public AutoWah = AutoWah;
    public BitCrusher = BitCrusher;
    public Chomp = Chomp;
    public Chopper = Chopper;
    public Chorus = Chorus;
    public Convolver = Convolver;
    public Delay = Delay;
    public Distortion = Distortion;
    public Envelope = Envelope;
    public EQ = EQ;
    public Filter = Filter;
    public Volume = Volume;
    public Vibrato = Vibrato;
    public Phaser = Phaser;
    public PitchShifter = PitchShifter;
    public Reverb = Reverb;
    public Scuzz = Scuzz;

    // POWER BLOCKS //
    public Laser = Laser;
    public Momentary = Momentary;
    public ParticleEmitter = ParticleEmitter;
    public Power = Power;
    public Toggle = Toggle;
    public Void = Void;

    // INTERACTION BLOCKS //
    public ComputerKeyboard = ComputerKeyboard;
    public MIDIController = MIDIController;

    constructor() {

    }

    public MenuJson: any = {
        "categories": [
            {
                "name": App.L10n.Blocks.Source.Label,
                "items": [
                    {
                        "name": App.L10n.Blocks.Source.Blocks.Tone.name,
                        "id": ToneSource,
                        "description": App.L10n.Blocks.Source.Blocks.Tone.description
                    },
                    {
                        "name": App.L10n.Blocks.Source.Blocks.Noise.name,
                        "id": Noise,
                        "description": App.L10n.Blocks.Source.Blocks.Noise.description
                    },
                    {
                        "name": App.L10n.Blocks.Source.Blocks.Microphone.name,
                        "id": Microphone,
                        "description": App.L10n.Blocks.Source.Blocks.Microphone.description
                    },
                    {
                        "name": App.L10n.Blocks.Source.Blocks.Soundcloud.name,
                        "id": Soundcloud,
                        "description": App.L10n.Blocks.Source.Blocks.Soundcloud.description
                    },
                    //{
                    //    "name": App.L10n.Blocks.Source.Blocks.Sampler.name,
                    //    "id": Sampler,
                    //    "description": App.L10n.Blocks.Source.Blocks.Sampler.description
                    //},
                    {
                        "name": App.L10n.Blocks.Source.Blocks.Granular.name,
                        "id": Granular,
                        "description": App.L10n.Blocks.Source.Blocks.Granular.description
                    },
                    {
                        "name": App.L10n.Blocks.Source.Blocks.Recorder.name,
                        "id": Recorder,
                        "description": App.L10n.Blocks.Source.Blocks.Recorder.description
                    },
                    {
                        "name": App.L10n.Blocks.Source.Blocks.WaveGen.name,
                        "id": WaveGen,
                        "description": App.L10n.Blocks.Source.Blocks.WaveGen.description
                    }
                ]
            },
            {
                "name": App.L10n.Blocks.Effect.Label,
                "items": [
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.AutoWah.name,
                        "id": AutoWah,
                        "description": App.L10n.Blocks.Effect.Blocks.AutoWah.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.BitCrusher.name,
                        "id": BitCrusher,
                        "description": App.L10n.Blocks.Effect.Blocks.BitCrusher.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Chomp.name,
                        "id": Chomp,
                        "description": App.L10n.Blocks.Effect.Blocks.Chomp.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Chopper.name,
                        "id": Chopper,
                        "description": App.L10n.Blocks.Effect.Blocks.Chopper.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Chorus.name,
                        "id": Chorus,
                        "description": App.L10n.Blocks.Effect.Blocks.Chorus.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Convolution.name,
                        "id": Convolver,
                        "description": App.L10n.Blocks.Effect.Blocks.Convolution.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Delay.name,
                        "id": Delay,
                        "description": App.L10n.Blocks.Effect.Blocks.Delay.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Distortion.name,
                        "id": Distortion,
                        "description": App.L10n.Blocks.Effect.Blocks.Distortion.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Envelope.name,
                        "id": Envelope,
                        "description": App.L10n.Blocks.Effect.Blocks.Envelope.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Eq.name,
                        "id": EQ,
                        "description": App.L10n.Blocks.Effect.Blocks.Eq.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Filter.name,
                        "id": Filter,
                        "description": App.L10n.Blocks.Effect.Blocks.Filter.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Vibrato.name,
                        "id": Vibrato,
                        "description": App.L10n.Blocks.Effect.Blocks.Vibrato.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Phaser.name,
                        "id": Phaser,
                        "description": App.L10n.Blocks.Effect.Blocks.Phaser.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.PitchShifter.name,
                        "id": PitchShifter,
                        "description": App.L10n.Blocks.Effect.Blocks.PitchShifter.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Reverb.name,
                        "id": Reverb,
                        "description": App.L10n.Blocks.Effect.Blocks.Reverb.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Scuzz.name,
                        "id": Scuzz,
                        "description": App.L10n.Blocks.Effect.Blocks.Scuzz.description
                    },
                    {
                        "name": App.L10n.Blocks.Effect.Blocks.Volume.name,
                        "id": Volume,
                        "description": App.L10n.Blocks.Effect.Blocks.Volume.description
                    }
                ]
            },
            {
                "name": App.L10n.Blocks.Power.Label,
                "items": [
                    {
                        "name": App.L10n.Blocks.Power.Blocks.ParticleEmitter.name,
                        "id": ParticleEmitter,
                        "description": App.L10n.Blocks.Power.Blocks.ParticleEmitter.description
                    },
                    {
                        "name": App.L10n.Blocks.Power.Blocks.Power.name,
                        "id": Power,
                        "description": App.L10n.Blocks.Power.Blocks.Power.description
                    },
                    {
                        "name": App.L10n.Blocks.Power.Blocks.TogglePower.name,
                        "id": Toggle,
                        "description": App.L10n.Blocks.Power.Blocks.TogglePower.description
                    },
                    {
                        "name": App.L10n.Blocks.Power.Blocks.Void.name,
                        "id": Void,
                        "description": App.L10n.Blocks.Power.Blocks.Void.description
                    },
                    {
                        "name": App.L10n.Blocks.Power.Blocks.MomentaryPower.name,
                        "id": Momentary,
                        "description": App.L10n.Blocks.Power.Blocks.MomentaryPower.description
                    },
                    {
                        "name": App.L10n.Blocks.Power.Blocks.Laser.name,
                        "id": Laser,
                        "description": App.L10n.Blocks.Power.Blocks.Laser.description
                    }
                ]
            },
            {
                "name": App.L10n.Blocks.Interaction.Label,
                "items": [
                    {
                        "name": App.L10n.Blocks.Interaction.Blocks.ComputerKeyboard.name,
                        "id": ComputerKeyboard,
                        "description": App.L10n.Blocks.Interaction.Blocks.ComputerKeyboard.description
                    },
                    {
                        "name": App.L10n.Blocks.Interaction.Blocks.MIDIController.name,
                        "id": MIDIController,
                        "description": App.L10n.Blocks.Interaction.Blocks.MIDIController.description
                    }
                ]
            }
        ]
    };

    public GetBlock(type: string): IBlock {
        type = this.BackwardsCompatibilityCheck(type);
        var b = eval("new this." + type + "()");
        b.Type = eval('this.' + type);
        return b;
    }

    // BACKWARDS COMPATIBILITY //
    // PATCH CHANGED BLOCK NAMES //
    public BackwardsCompatibilityCheck(type: string): string {
        switch (type) {
            case 'Gain':
                type = 'Volume';
                break;
            case "Pitch":
                type = 'PitchShifter';
                break;
            case "LFO":
                //TODO: if we want to use LFO in the future we need to check version number also
                type = 'Vibrato';
                break;
        }
        return type;
    }
}