import {AccumulativeConnectionMethod} from './Connections/ConnectionMethods/AccumulativeConnectionMethod';
import {AudioFileManager} from './AudioFileManager';
import {AudioNodeConnectionManager} from './AudioNodeConnectionManager';
import {ConnectionManager} from './Connections/ConnectionManager';
import {ConnectionMethodType} from './Connections/ConnectionMethodType';
import {IApp} from '../../IApp';
import {IAudio} from './IAudio';
import {IBlock} from '../../Blocks/IBlock';
import {MIDIManager} from './MIDIManager';
import {SimpleConnectionMethod} from './Connections/ConnectionMethods/SimpleConnectionMethod';
import {Waveform} from './Waveform';

declare var App: IApp;

export class Audio implements IAudio {

    public Tone: Tone;
    public ctx: AudioContext;
    public sampleRate: number;
    public Master: Tone.Master;
    public Meter: Tone.Meter;
    public MasterVolume: number = -10; // in decibels
    public NoteIndex: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    public WaveformTypeIndex: string[] = ['sine', 'square', 'triangle', 'sawtooth'];
    public WaveformTypeIndexNoise: string[] = ['white', 'pink', 'brown'];

    public AudioFileManager: AudioFileManager;
    public AudioNodeConnectionManager: AudioNodeConnectionManager;
    public ConnectionManager: ConnectionManager;
    public ConnectionMethodType: ConnectionMethodType;
    public HasBufferSourceDetuneCapability: boolean
    public MIDIManager: MIDIManager;
    public Waveform: Waveform;
    public WaveWorker: Worker;

    public Level: number;
    public Peak: number;
    public Clip: boolean;

    Init() {

        // Reference to Tone
        this.Tone = new Tone();

        // Reference to the web audio context
        this.ctx = this.Tone.context;

        this.sampleRate = this.ctx.sampleRate;

        // Master Output
        this.Master = Tone.Master;

        //some overall compression to keep the levels in check
        var masterCompressor: DynamicsCompressorNode = this.ctx.createDynamicsCompressor();
        masterCompressor.threshold.value = -8;
        masterCompressor.knee.value = 10;
        masterCompressor.ratio.value = 8;
        masterCompressor.attack.value = 0;
        masterCompressor.release.value = 0.05;
        // route everything through the compressor before going to the speakers
        this.Master.chain(masterCompressor);

        //Meter
        this.Meter = new Tone.Meter();
        this.Master.connect(this.Meter);
        this.Level = 0;
        this.Peak = 0;
        this.Clip = false;

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

        // Wave Web Worker //
        this.WaveWorker = new Worker("Workers/WaveWorker.js");

        this.WaveWorker.onmessage = function(e) {

            // get block //
            var block: IBlock = null;
            for (var i=0; i<App.Blocks.length; i++) {
                if (e.data.blockId === App.Blocks[i].Id) {
                    block = App.Blocks[i];
                }
            }
            if (block) {
                block.SetReversedBuffer(e.data.buffer);
            }
        }

        // Save a check to see if browser supports BufferSource.detune
        this.HasBufferSourceDetuneCapability = !!this.ctx.createBufferSource().detune;
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

    Monitor() {
        this.Level = this.MeterVolumeDb;

        if (this.Level > this.Peak) {
            this.Peak = this.Level;
        }
        if (this.Peak > 0) {
            this.Clip = true;
        }
    }

    MonitorReset() {
        this.Peak = 0;
        this.Clip = false;
    }

    ReverseBuffer(blockId: number, buffer: any) {
        if (this.WaveWorker) {

            var channelNo = buffer.numberOfChannels;

            // TURN OUR BUFFER DATA INTO ARRAYS //
            var channels = [];
            for (var i=0;i<channelNo; i++) {
                channels.push(buffer.getChannelData(i));
            }

            // SEND TO WORKER //
            this.WaveWorker.postMessage({
                "blockId": blockId,
                "channels": channels
            });
            console.log('Message posted to worker');
        }
    }

    DigestBuffer(blockId: number, buffer: any) {

        var master = [];

    }


}