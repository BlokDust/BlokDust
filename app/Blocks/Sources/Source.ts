import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class Source extends Modifiable {

    public Source: any;
    public Envelope: Tone.Envelope;
    public Delay: Tone.PingPongDelay;
    public OutputGain: Tone.Signal;
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

        if (this.BlockType == BlockType.Noise) {
            this.Source = new Tone.Noise(this.Settings.noise.waveform);

        } else if (this.BlockType == BlockType.ToneSource) {
            this.Source = new Tone.Oscillator(this.Settings.oscillator.frequency, this.Settings.oscillator.waveform);

        } else if (this.BlockType == BlockType.Microphone) {
            this.Source = new Tone.Microphone();

        } else if (this.BlockType == BlockType.Soundcloud) {
            var scId = "?client_id=7bfc58cb50688730352c60eb933aee3a";
            var track1 = "24456532";
            var track2 = "25216773";
            var track3 = "5243666";
            var track4 = "84216161";
            var track5 = "51167662";
            var track6 = "172375224";
            var track7 = "172375481";
            var ubbb = "151541687";
            var johnwiz = "94492842";

            var audioUrl = "https://api.soundcloud.com/tracks/" + johnwiz + "/stream" + scId;
            var sc = this.Source;

            this.Source = new Tone.Player(audioUrl, function (sc) {
                console.log(sc);
                sc.loop = true;
                sc.start();
            });

        } else if (this.BlockType == BlockType.Recorder) {
            this.Source = new Tone.Player();

        } else {
            console.log('this typeof Source does not have a matching BlockType');
        }

        // Define the audio nodes
        this.Envelope = new Tone.Envelope(this.Settings.envelope.attack, this.Settings.envelope.decay, this.Settings.envelope.sustain, this.Settings.envelope.release);

        this.OutputGain = new Tone.Signal;
        this.OutputGain.output.gain.value = this.Settings.output.volume;

        //Connect them up
        if (this.BlockType == BlockType.Noise || this.BlockType == BlockType.ToneSource ) {
            this.Envelope.connect(this.Source.output.gain);
        }

        if (this.BlockType == BlockType.Soundcloud) {
            /*var audioUrl;
             SC.initialize({
             client_id: '7bfc58cb50688730352c60eb933aee3a'
             });
             var rawUrl = "https://soundcloud.com/whitehawkmusic/deep-mutant";
             SC.get('/resolve', { url: rawUrl }, function(track) {
             audioUrl = ""+track.stream_url +
             "?client_id=7bfc58cb50688730352c60eb933aee3a";
             });*/

            //var audioUrl = "https://api.soundcloud.com/tracks/145840993/stream?client_id=7bfc58cb50688730352c60eb933aee3a";
            //this.Source.load(audioUrl, this.StreamLoaded(this.Source));
        }



        this.Source.connect(this.OutputGain);
        this.OutputGain.connect(App.AudioMixer.Master);
        this.OpenParams();

        // Start
        this.Source.start();
    }

    StreamLoaded(source) {
        console.log("PLAYER INITIALISED");
        source.start();
        console.log(source);
    }

    Delete() {
        this.Envelope.dispose();
        this.OutputGain.dispose();
        this.Source.stop();
        this.Source.dispose();
    }

    GetValue(param: string) {

        var val;
        switch (param){
            case "frequency": val = this.Source.getFrequency();
                break;
            case "detune": val = this.Source.getDetune();
                break;
            case "waveform": val = this.Source.getType();
                break;
            case "volume": val = this.Source.getGain();
                break;
            case "playbackRate": val = this.Source.getPlaybackRate();
                break;
        }
        console.log(val);
        return val;

    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        switch (param){
            case "frequency": this.Source.setFrequency(value);
                break;
            case "detune": this.Source.setDetune(value);
                break;
            case "waveform": this.Source.setType(value);
                break;
            case "volume": this.Source.setGain(value);
                break;
            case "playbackRate": this.Source.setPlaybackRate(value, 0.2);
        }


        console.log(jsonVariable);
    }

}

export = Source;