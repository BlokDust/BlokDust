class Config {
    public MaxOperations: number;
    public PixelPaletteImagePath: string[];
    public SoundCloudClientId: string;
    public PolyphonicVoices: number;
    public PulseLength: Tone.Time;
    public SoundCloudDefaultTracks: string[];
    public SoundCloudMaxTrackLength: number;
    public GranularDefaultTracks: string[];
    public GranularMaxTrackLength: number;
    public ConvolverDefaultTracks: string[];
    public ConvolverMaxTrackLength: number;
    public BaseNote: number;
    public SoundCloudLoadTimeout: number;
    public ResetPitchesOnInteractionDisconnect: boolean;
}

export = Config;
