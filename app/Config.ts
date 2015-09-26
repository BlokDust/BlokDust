export class Config {
    public BaseNote: number;
    public ConvolverDefaultTracks: string[];
    public ConvolverMaxTrackLength: number;
    public GranularDefaultTracks: string[];
    public GranularMaxTrackLength: number;
    public MaxOperations: number;
    public PixelPaletteImagePath: string[];
    public PolyphonicVoices: number;
    public PulseLength: Tone.Time;
    public RecorderWorkerPath: string;
    public ResetPitchesOnInteractionDisconnect: boolean;
    public ScrollEasing: number;
    public ScrollSpeed: number;
    public SoundCloudClientId: string;
    public SoundCloudDefaultTracks: string[];
    public SoundCloudLoadTimeout: number;
    public SoundCloudMaxTrackLength: number;
}