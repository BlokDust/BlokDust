import IBlock = require("./IBlock");
import IModifier = require("./IModifier");
import IEffect = require("./IEffect");

interface IModifiable extends IBlock{
    Modifiers: Fayde.Collections.ObservableCollection<IModifier>;
    AddModifier(modifier: IModifier): void;
    RemoveModifier(modifier: IModifier): void;
    Osc: Tone.Oscillator;
    Noise: Tone.Noise;
    Envelope: Tone.Envelope;
    OutputGain: GainNode;

    params?: {
        oscillator?: {
            frequency: number;
            waveform: string;
        }
        noise?: {
            waveform: string;
        }
        envelope: {
            attack: number;
            decay: number;
            sustain: number;
            release: number;
        }
        output: {
            volume: number;
        }
    };

}

export = IModifiable;