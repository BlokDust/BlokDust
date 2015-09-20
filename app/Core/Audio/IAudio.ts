import {AccumulativeConnectionMethod} from './Connections/ConnectionMethods/AccumulativeConnectionMethod';
import {AudioFileManager} from './AudioFileManager';
import {AudioNodeConnectionManager} from './AudioNodeConnectionManager';
import {ConnectionManager} from './Connections/ConnectionManager';
import {ConnectionMethodType} from './Connections/ConnectionMethodType';
import {MIDIManager} from './MIDIManager';
import {SimpleConnectionMethod} from './Connections/ConnectionMethods/SimpleConnectionMethod';
import {Waveform} from './Waveform';

export interface IAudio {

    Tone: Tone;
    ctx: AudioContext;
    sampleRate: number;
    Master: Tone.Master;
    Meter: Tone.Meter;
    MasterVolume: number;
    NoteIndex: string[];

    AudioNodeConnectionManager: AudioNodeConnectionManager;
    AudioFileManager: AudioFileManager;
    MIDIManager: MIDIManager;
    ConnectionMethodType: ConnectionMethodType;
    ConnectionManager: ConnectionManager;
    Waveform: Waveform;

    Init(): void

    MeterVolumeDb: number
    MeterVolume: number
    HasClipped: boolean
}