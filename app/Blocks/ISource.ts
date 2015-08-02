import IBlock = require("./IBlock");
import Source = require("./Source");
import IEffect = require("./IEffect");
import Voice = require("./Interaction/VoiceObject");
import SoundcloudTrack = require("../UI/SoundcloudTrack");
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
    PowerConnections: number;
    ParticlePowered: boolean;
    LaserPowered: boolean;
    UpdateCollision: boolean;
    Collisions: any[];
    SearchResults: SoundcloudTrack[];
    Searching: Boolean;
    ResultsPage: number;
    SearchString: string;
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
    GetWaveformFromBuffer(buffer: any, detail: number, precision: number,  normal: number): number[];
    TriggerAttack(index?: number|string): void;
    TriggerRelease(index?: number|string): void;
    TriggerAttackRelease(duration?: Tone.Time, time?: Tone.Time, velocity?: number): void;
    IsPowered(): boolean;
    Refresh(): void;
}

export = ISource;