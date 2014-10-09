import IBlock = require("./IBlock");
import IModifier = require("./IModifier");
import IEffect = require("./IEffect");
import ObservableCollection = Fayde.Collections.ObservableCollection;

interface IModifiable extends IBlock{
    Modifiers: Fayde.Collections.ObservableCollection<IModifier>;
    AddModifier(modifier: IModifier): void;
    RemoveModifier(modifier: IModifier): void;
    Osc?: Tone.Oscillator;
    Noise?: Tone.Noise;
    Envelope?: Tone.Envelope;
    OutputGain?: GainNode;
    Params?: ToneSettings;
    ValidateModifiers(modifiers: ObservableCollection<IModifier>): void;
}

export = IModifiable;