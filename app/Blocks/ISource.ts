import IBlock = require("./IBlock");
import IEffect = require("./IEffect");
import ObservableCollection = Fayde.Collections.ObservableCollection;

interface ISource extends IBlock{
    Effects: Fayde.Collections.ObservableCollection<IEffect>;
    AddEffect(effect: IEffect): void;
    RemoveEffect(effect: IEffect): void;
    BlockType?: any;
    Source?: any; // Use this when available: Tone.Oscillator || Tone.Noise
    Envelope?: Tone.Envelope;
    EffectsChainInput?: Tone.Signal;
    OutputGain?: Tone.Signal;
    Settings?: ToneSettings;
    Frequency?: number;
    PlaybackRate?: number;
    Grains?: Tone.Player[];
    MaxDensity?: number;
    RecordedAudio?: any;
    PolySources?: any[];
    PolyEnvelopes?: any[];
    ValidateEffects(): void;
    SetPlaybackRate(rate,time): void;
    TriggerAttack(): void;
    TriggerRelease(): void;
}

export = ISource;