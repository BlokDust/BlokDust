import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");


class SourceComponent {

    public Source: any; // Use this when available: Tone.Oscillator || Tone.Noise
    public Envelope: Tone.Envelope;
    public Delay: Tone.PingPongDelay;
    public OutputGain: Tone.Signal;
    public Noise: Tone.Noise;
    public Params: ToneSettings;

    constructor(params) {

        this.Params = params; //Should extend object in case all properties aren't given.

        if (this.Params.noise){
            this.Source = new Tone.Noise(this.Params.noise.waveform);
        }

        if (this.Params.oscillator) {
            this.Source = new Tone.Oscillator(this.Params.oscillator.frequency, this.Params.oscillator.waveform);
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

export = SourceComponent;