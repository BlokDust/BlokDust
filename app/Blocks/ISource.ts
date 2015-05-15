import IBlock = require("./IBlock");
import IEffect = require("./IEffect");
import Voice = require("./Interaction/VoiceObject");
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
    ActiveVoices: Voice[];
    FreeVoices: Voice[];
    CreateSource();
    CreateEnvelope();
    ValidateEffects(): void;
    SetPlaybackRate(rate,time): void;
    SetPitch(pitch: Tone.Frequency, sourceId?: number, rampTime?: Tone.Time): void;
    TriggerAttack(envelope?:number): void;
    TriggerRelease(): void;
    Refresh(): void;
}

export = ISource;