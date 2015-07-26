import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import Effect = require("../Effect");
import Block = require("../Block");
import Particle = require("../../Particle");

class ToneSource extends Source {

    public Sources: Tone.Oscillator[];
    //public Frequency: number;
    //public Waveform: string;
    public Envelopes: Tone.AmplitudeEnvelope[];

    //TODO: move this
    NoteIndex = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                frequency: App.Config.BaseNote,
                waveform: 2,
                transpose: 0,
            };
        }


        super.Init(sketch);

        this.CreateSource();
        this.CreateEnvelope();

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
            e.connect(this.EffectsChainInput);
        });

        this.Sources.forEach((s: Tone.Oscillator, i: number)=> {
            s.connect(this.Envelopes[i]);
            s.start();
        });

        // Define Outline for HitTest
        this.Outline.push(new Point(-2, 0), new Point(0, -2), new Point(2, 0), new Point(1, 1), new Point(-1, 1));
    }

    CreateSource(){
        // add it to the list of sources
        this.Sources.push( new Tone.Oscillator(this.Params.frequency, this.WaveIndex[this.Params.waveform]));

        // return it
        return super.CreateSource();
    }

    CreateEnvelope(){
        this.Envelopes.push( new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        ));

        return super.CreateEnvelope();
    }

    Dispose() {
        super.Dispose();
        this.Params.frequency = null;

        this.Sources.forEach((s: any) => {
            s.dispose();
        });

        this.Envelopes.forEach((e: any) => {
            e.dispose();
        });

    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"tone");
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Tone",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Frequency",
                    "setting" :"frequency",
                    "props" : {
                        "value" : this.Params.frequency,
                        "min" : 10,
                        "max" : 15000,
                        "quantised" : true,
                        "centered" : false,
                        "logarithmic": true
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Transpose",
                    "setting" :"transpose",
                    "props" : {
                        "value" : this.Params.transpose,
                        "min" : -48,
                        "max" : 48,
                        "quantised" : true,
                        "centered" : true
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Waveform",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.Params.waveform,
                        "min" : 0,
                        "max" : 3,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

    //TODO: move this
    interval2freq(interval: number): number {
        return Math.pow(2,(interval/12));
    }

    SetParam(param: string,value: any) {


        var val = value;

        switch(param) {
            case "frequency":
                this.Sources[0].frequency.value = value;
                break;
            case 'transpose':
                this.Sources[0].frequency.value = App.Config.BaseNote * this.interval2freq(value);

                // TODO: Make the params output this Note Index instead of semitone value
                var octave = Math.floor(value / 12) + 4;
                var note = this.NoteIndex[Math.abs(value%12)];
                console.log(`Note: ${note}${octave}`);
                break;
        }

        this.Params[param] = val;

        super.SetParam(param,value);
    }
}

export = ToneSource;