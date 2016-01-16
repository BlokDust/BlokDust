export interface IConfig {
    Attribution: any;
    BaseNote: number;
    ConvolverDefaultTracks: string[];
    ConvolverMaxTrackLength: number;
    Errors: any;
    GranularDefaultTracks: string[];
    GranularMaxTrackLength: number;
    MaxOperations: number;
    PixelPaletteImagePath: string[];
    PolyphonicVoices: number;
    PulseLength: Tone.Time;
    RecorderWorkerPath: string;
    ResetPitchesOnInteractionDisconnect: boolean;
    ScrollEasing: number;
    ScrollSpeed: number;
    SoundCloudClientId: string;
    SoundCloudDefaultTracks: string[];
    SoundCloudLoadTimeout: number;
    SoundCloudMaxTrackLength: number;
}