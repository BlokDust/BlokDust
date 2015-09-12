import AudioNodeConnectionManager = require("./AudioNodeConnectionManager");
import AudioFileManager = require("./AudioFileManager");
import ConnectionMethodType = require("./Connections/ConnectionMethodType");
import ConnectionManager = require("./Connections/ConnectionManager");
import SimpleConnectionMethod = require("./Connections/ConnectionMethods/SimpleConnectionMethod");
import AccumulativeConnectionMethod = require("./Connections/ConnectionMethods/AccumulativeConnectionMethod");

class Audio {

    public Tone: Tone;
    public ctx: AudioContext;
    public sampleRate: number;
    public Master: Tone.Master;
    public Meter: Tone.Meter;
    public MasterVolume: number = -10; // in decibels
    public NoteIndex: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    public AudioNodeConnectionManager: AudioNodeConnectionManager;
    public AudioFileManager: AudioFileManager;
    public ConnectionMethodType: ConnectionMethodType;
    public ConnectionManager: ConnectionManager;

    Init() {

        // Reference to Tone
        this.Tone = new Tone();

        // Reference to the web audio context
        this.ctx = this.Tone.context;

        this.sampleRate = this.ctx.sampleRate;

        // Master Output
        this.Master = Tone.Master;

        //Meter
        this.Meter = new Tone.Meter();
        this.Master.connect(this.Meter);

        // Master Gain Level
        this.Master.volume.value = this.MasterVolume;

        //AudioNode Connection Manager
        this.AudioNodeConnectionManager = new AudioNodeConnectionManager();

        // Set the connection method type
        this.ConnectionMethodType = ConnectionMethodType.Accumulative;
        switch (this.ConnectionMethodType) {
            case ConnectionMethodType.Simple:
                this.ConnectionManager = new SimpleConnectionMethod();
                break;
            case ConnectionMethodType.Accumulative:
                this.ConnectionManager = new AccumulativeConnectionMethod();
                break;
            default:
                console.error('No connection method set');
        }

        // Audio File manager
        this.AudioFileManager = new AudioFileManager();

    }

    get MeterVolumeDb(): number {
        return this.Meter.getDb();
    }

    get MeterVolume(): number {
        return this.Meter.getLevel();
    }

    get HasClipped(): boolean {
        return this.Meter.isClipped();
    }


}

export = Audio;