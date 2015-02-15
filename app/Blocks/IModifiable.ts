import IBlock = require("./IBlock");
import IEffect = require("./IEffect");
import ObservableCollection = Fayde.Collections.ObservableCollection;

interface IModifiable extends IBlock{
    Effects: Fayde.Collections.ObservableCollection<IEffect>;
    AddEffect(effect: IEffect): void;
    RemoveEffect(effect: IEffect): void;
    Source?: any; // Use this when available: Tone.Oscillator || Tone.Noise
    Envelope?: Tone.Envelope;
    Delay?: Tone.PingPongDelay;
    OutputGain?: Tone.Signal;
    Settings?: ToneSettings;
    ConnectedKeyboards?: number;
    ValidateEffects(): void;
}

export = IModifiable;