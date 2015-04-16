import IBlock = require("./IBlock");
import IEffect = require("./IEffect");
import ObservableCollection = Fayde.Collections.ObservableCollection;

interface ISource extends IBlock{
    Effects: Fayde.Collections.ObservableCollection<IEffect>;
    AddEffect(effect: IEffect): void;
    RemoveEffect(effect: IEffect): void;
    Sources?: any[]; // Use this when available: Tone.Oscillator || Tone.Noise
    Envelopes?: Tone.AmplitudeEnvelope[];
    EffectsChainInput?: Tone.Signal;
    OutputGain?: Tone.Signal;
    Settings?: ToneSettings;
    //Params: any;
    Frequency?: number;
    PlaybackRate?: number;
    Grains?: Tone.Player[];
    MaxDensity?: number;
    RecordedAudio?: any;
    LoopStartPosition?: number;
    LoopEndPosition?: number;
    CreateSource(): void;
    ValidateEffects(): void;
    SetPlaybackRate(rate,time): void;
    TriggerAttack(envelope?:number): void;
    TriggerRelease(): void;
    Refresh(): void;
}

export = ISource;