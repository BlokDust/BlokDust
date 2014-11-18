import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class Source extends Modifiable{

    public Source: any; // Use this when available: Tone.Oscillator || Tone.Noise
    public Envelope: Tone.Envelope;
    public Delay: Tone.PingPongDelay;
    public OutputGain: Tone.Signal;
    public Noise: Tone.Noise;
    private _Params: ToneSettings = {

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
        return this._Params;
    }

    set Params(value: ToneSettings) {
        this._Params = value;
    }

    constructor(grid: Grid, position: Point) {
        super(grid, position);

        if (this.BlockType == BlockType.Noise){
            this.Source = new Tone.Noise(this._Params.noise.waveform);
        } else if (this.BlockType == BlockType.ToneSource) {
            this.Source = new Tone.Oscillator(this._Params.oscillator.frequency, this._Params.oscillator.waveform);
        } else {
            console.log('this typeof Source does not have a matching BlockType');
        }

        // Define the audio nodes
        this.Envelope = new Tone.Envelope(this.Params.envelope.attack, this.Params.envelope.decay, this.Params.envelope.sustain, this.Params.envelope.release);
        this.Delay = new Tone.PingPongDelay(1);
        this.Delay.setWet(0);
        this.OutputGain = new Tone.Signal;
        this.OutputGain.output.gain.value = this.Params.output.volume;

        // Connect them up
        this.Envelope.connect(this.Source.output.gain);
        this.Source.chain(this.Source, this.Delay, this.OutputGain, App.AudioMixer.Master);

        // Start
        this.Source.start();
    }
}

export = Source;