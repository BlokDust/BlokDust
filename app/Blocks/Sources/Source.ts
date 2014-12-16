import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class Source extends Modifiable {

    public Source: any; // TODO: Set type of Source to.. "Tone.Oscillator || Tone.Noise" when available:
    public Envelope: Tone.Envelope;
    public Delay: Tone.PingPongDelay;
    public OutputGain: Tone.Signal;
    public ConnectedKeyboards: number = 0;
    public Frequency: number;
    public Settings: ToneSettings = {

        oscillator: {
            frequency: 440,
            waveform: 'sawtooth'
        },
        noise: {
            waveform: 'brown'
        },
        envelope: {
            attack: 0.02,
            decay: 0.5,
            sustain: 0.5,
            release: 0.02
        },
        output: {
            volume: 0.5
        }
    };

    get Params(): ToneSettings {
        return this.Settings;
    }

    set Params(value: ToneSettings) {
        this.Settings = value;
    }

    constructor(grid: Grid, position: Point) {
        super(grid, position);

        this.Frequency = this.Settings.oscillator.frequency;

        if (this.BlockType == BlockType.Noise){
            this.Source = new Tone.Noise(this.Settings.noise.waveform);
        } else if (this.BlockType == BlockType.ToneSource) {
            this.Source = new Tone.Oscillator(this.Settings.oscillator.frequency, this.Settings.oscillator.waveform);
        } else if (this.BlockType == BlockType.Microphone) {
            this.Source = new Tone.Microphone();

        } else {
            console.log('this typeof Source does not have a matching BlockType');
        }

        // Define the audio nodes
        this.Envelope = new Tone.Envelope(this.Settings.envelope.attack, this.Settings.envelope.decay, this.Settings.envelope.sustain, this.Settings.envelope.release);

        this.OutputGain = new Tone.Signal;
        this.OutputGain.output.gain.value = this.Settings.output.volume;

        // Connect them up
        if (this.BlockType == BlockType.Noise || this.BlockType == BlockType.ToneSource ) {
            this.Envelope.connect(this.Source.output.gain);
        }

        this.Source.connectSeries(this.Source, this.OutputGain, App.AudioMixer.Master);

        // Start
        this.Source.start();
    }

    Delete() {
        this.Envelope.dispose();
        this.OutputGain.dispose();
        this.Source.stop();
        this.Source.dispose();
    }


}

export = Source;