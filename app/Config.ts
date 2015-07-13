class Config {
    public MaxOperations: number;
    public PixelPaletteImagePath: string;
    public SoundCloudClientId: string;
    public PolyphonicVoices: number;
    public PulseLength: Tone.Time;
    public SoundCloudDefaultTracks: string[];
    public GranularDefaultTracks: string[];
    public ConvolverDefaultTracks: string[];
    public BaseNote: number;
}

export = Config;
