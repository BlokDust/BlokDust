class Audio {

    public Tone: Tone;
    public ctx: AudioContext;
    public Master: Tone.Master;
    public MasterVolume: number = -10; // in decibels
    public NoteIndex: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    constructor() {

        // Reference to Tone
        this.Tone = new Tone();

        // Reference to the web audio context
        this.ctx = this.Tone.context;

        // Master Output
        this.Master = Tone.Master;

        // Master Gain Level
        this.Master.volume.value = this.MasterVolume;

    }

}

export = Audio;