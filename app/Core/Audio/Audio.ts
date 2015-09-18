import {AccumulativeConnectionMethod} from './Connections/ConnectionMethods/AccumulativeConnectionMethod';
import {AudioFileManager} from './AudioFileManager';
import {AudioNodeConnectionManager} from './AudioNodeConnectionManager';
import {ConnectionManager} from './Connections/ConnectionManager';
import {ConnectionMethodType} from './Connections/ConnectionMethodType';
import {MIDIManager} from './MIDIManager';
import {SimpleConnectionMethod} from './Connections/ConnectionMethods/SimpleConnectionMethod';
import {Waveform} from './Waveform';

export class Audio {

    public Tone: Tone;
    public ctx: AudioContext;
    public sampleRate: number;
    public Master: Tone.Master;
    public Meter: Tone.Meter;
    public MasterVolume: number = -10; // in decibels
    public NoteIndex: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    public AudioNodeConnectionManager: AudioNodeConnectionManager;
    public AudioFileManager: AudioFileManager;
    public MIDIManager: MIDIManager;
    public ConnectionMethodType: ConnectionMethodType;
    public ConnectionManager: ConnectionManager;
    public Waveform: Waveform;

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

        // MIDI Manager
        this.MIDIManager = new MIDIManager();
        this.MIDIManager.Init();

        // Waveform Class
        this.Waveform = new Waveform();

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