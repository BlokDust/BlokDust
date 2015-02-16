import IBlock = require("./IBlock");
import IEffect = require("./IEffect");
import ObservableCollection = Fayde.Collections.ObservableCollection;

interface ISource extends IBlock{
    Effects: Fayde.Collections.ObservableCollection<IEffect>;
    AddEffect(effect: IEffect): void;
    RemoveEffect(effect: IEffect): void;
    Source?: any; // Use this when available: Tone.Oscillator || Tone.Noise
    Envelope?: Tone.Envelope;
    OutputGain?: Tone.Signal;
    Settings?: ToneSettings;
    Frequency?: number;
    //ValidateEffects(): void;
}

export = ISource;