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
    WaveIndex: string[];
    //Frequency?: number;
    PlaybackRate?: number;
    Grains?: Tone.Player[];
    MaxDensity?: number;
    RecordedAudio?: any;
    LoopStartPosition?: number;
    LoopEndPosition?: number;
    ActiveVoices: Voice[];
    FreeVoices: Voice[];
    CreateSource(): any;
    CreateEnvelope(): Tone.AmplitudeEnvelope;
    ValidateEffects(): void;
    SetPitch(pitch: Tone.Frequency, sourceId?: number, rampTime?: Tone.Time): void;
    GetPitch(sourceId?: number): number;
    OctaveShift(octavesAmount: number): void;
    TriggerAttack(index?: number|string): void;
    TriggerRelease(index?: number|string): void;
    Refresh(): void;
}

export = ISource;