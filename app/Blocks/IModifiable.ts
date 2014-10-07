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
    Params: ToneSettings;


}

export = IModifiable;