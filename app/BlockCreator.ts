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

import {IApp} from "./IApp";

declare var TheApp: IApp;

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
                "name": TheApp.L10n.Blocks.Source.Blocks.Label,
                "items": [
                    {
                        "name": TheApp.L10n.Blocks.Source.Blocks.Tone.name,
                        "id": ToneSource,
                        "description": TheApp.L10n.Blocks.Source.Blocks.Tone.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Source.Blocks.Noise.name,
                        "id": Noise,
                        "description": TheApp.L10n.Blocks.Source.Blocks.Noise.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Source.Blocks.Microphone.name,
                        "id": Microphone,
                        "description": TheApp.L10n.Blocks.Source.Blocks.Microphone.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Source.Blocks.Soundcloud.name,
                        "id": Soundcloud,
                        "description": TheApp.L10n.Blocks.Source.Blocks.Soundcloud.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Source.Blocks.Sampler.name,
                        "id": Sampler,
                        "description": TheApp.L10n.Blocks.Source.Blocks.Sampler.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Source.Blocks.Granular.name,
                        "id": Granular,
                        "description": TheApp.L10n.Blocks.Source.Blocks.Granular.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Source.Blocks.Recorder.name,
                        "id": Recorder,
                        "description": TheApp.L10n.Blocks.Source.Blocks.Recorder.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Source.Blocks.WaveGen.name,
                        "id": WaveGen,
                        "description": TheApp.L10n.Blocks.Source.Blocks.WaveGen.description
                    }
                ]
            },
            {
                "name": TheApp.L10n.Blocks.Effect.Label,
                "items": [
                    {
                        "name": TheApp.L10n.Blocks.Effect.AutoWah.name,
                        "id": AutoWah,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.AutoWah.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.BitCrusher.name,
                        "id": BitCrusher,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Bitcrusher.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Chomp.name,
                        "id": Chomp,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Chomp.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Chopper.name,
                        "id": Chopper,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Chopper.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Chorus.name,
                        "id": Chorus,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Chorus.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Convolution.name,
                        "id": Convolver,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Convolution.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Delay.name,
                        "id": Delay,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Delay.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Distortion.name,
                        "id": Distortion,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Distortion.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Envelope.name,
                        "id": Envelope,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Envelope.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Eq.name,
                        "id": EQ,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Eq.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Filter.name,
                        "id": Filter,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Filter.description
                    },
                    {
                        "name":TheApp.L10n.Blocks.Effect.Blocks.LFO.name,
                        "id": LFO,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.LFO.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Phaser.name,
                        "id": Phaser,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Phaser.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Pitch.name,
                        "id": Pitch,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Pitch.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Reverb.name,
                        "id": Reverb,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Reverb.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Scuzz.name,
                        "id": Scuzz,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Scuzz.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Effect.Blocks.Volume.name,
                        "id": Volume,
                        "description": TheApp.L10n.Blocks.Effect.Blocks.Volume.description
                    }
                ]
            },
            {
                "name": TheApp.L10n.Blocks.Power.Blocks.Label,
                "items": [
                    {
                        "name": TheApp.L10n.Blocks.Power.Blocks.ParticleEmitter.name,
                        "id": ParticleEmitter,
                        "description": TheApp.L10n.Blocks.Power.Blocks.ParticleEmitter.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Power.Blocks.Power.name,
                        "id": Power,
                        "description": TheApp.L10n.Blocks.Power.Blocks.Power.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Power.Blocks.TogglePower.name,
                        "id": Toggle,
                        "description": TheApp.L10n.Blocks.Power.Blocks.TogglePower.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Power.Blocks.Void.name,
                        "id": Void,
                        "description": TheApp.L10n.Blocks.Power.Blocks.Void.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Power.Blocks.MomentaryPower.name,
                        "id": Momentary,
                        "description": TheApp.L10n.Blocks.Power.Blocks.MomentaryPower.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Power.Blocks.Laser.name,
                        "id": Laser,
                        "description": TheApp.L10n.Blocks.Power.Blocks.Laser.description
                    }
                ]
            },
            {
                "name": TheApp.L10n.Blocks.Interaction.Label,
                "items": [
                    {
                        "name": TheApp.L10n.Blocks.Interaction.Blocks.ComputerKeyboard.name,
                        "id": ComputerKeyboard,
                        "description": TheApp.L10n.Blocks.Interaction.Blocks.ComputerKeyboard.description
                    },
                    {
                        "name": TheApp.L10n.Blocks.Interaction.Blocks.MIDIController.name,
                        "id": MIDIController,
                        "description": TheApp.L10n.Blocks.Interaction.Blocks.MIDIController.description
                    }
                ]
            }
        ]
    };

    public static GetBlock(type: string): IBlock {
        type = this.BackwardsCompatibilityCheck(type);
        var b = eval("new BlockCreator." + type + "()");
        b.Type = eval('BlockCreator.'+type);
        return b;
    }

    // BACKWARDS COMPATIBILITY //
    // PATCH CHANGED BLOCK NAMES //
    public static BackwardsCompatibilityCheck(type: string): string {
        if (("" + type) === "Gain") { // todo: coerce to string using .toString() or <String>?
            type = "Volume";
        }
        return type;
    }
}