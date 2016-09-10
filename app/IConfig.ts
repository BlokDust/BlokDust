export interface IConfig {
    BaseNote: number;
    DefaultNote: number;
    DeltaEnabled: boolean;
    ConvolverDefaultTracks: string[];
    ConvolverMaxTrackLength: number;
    GranularDefaultTracks: string[];
    GranularMaxTrackLength: number;
    MaxOperations: number;
    PixelPaletteImagePath: string[];
    PolyphonicVoices: number;
    PlaybackRange: number;
    PitchBendRange: number;
    PulseLength: number;
    RecorderWorkerPath: string;
    ResetPitchesOnInteractionDisconnect: boolean;
    ScrollEasing: number;
    ScrollSpeed: number;
    SoundCloudClientId: string;
    SoundCloudDefaultTracks: string[];
    SoundCloudLoadTimeout: number;
    SoundCloudMaxTrackLength: number;
    SingleClickTime: number;
    StorageTime: number;
}