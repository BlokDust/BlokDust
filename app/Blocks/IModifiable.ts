import IBlock = require("./IBlock");
import IModifier = require("./IModifier");
import IEffect = require("./IEffect");
import ObservableCollection = Fayde.Collections.ObservableCollection;

interface IModifiable extends IBlock{
    Modifiers: Fayde.Collections.ObservableCollection<IModifier>;
    AddModifier(modifier: IModifier): void;
    RemoveModifier(modifier: IModifier): void;
    Source?: any; // Use this when available: Tone.Oscillator || Tone.Noise
    Envelope?: Tone.Envelope;
    Delay?: Tone.PingPongDelay;
    OutputGain?: Tone.Signal;
    Params?: ToneSettings;
    ValidateModifiers(): void;
}

export = IModifiable;