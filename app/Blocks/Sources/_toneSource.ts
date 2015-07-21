import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import Effect = require("../Effect");
import Block = require("../Block");
import Particle = require("../../Particle");

class ToneSource extends Source {

    public Sources: Tone.Oscillator[];
    public Envelopes: Tone.AmplitudeEnvelope[];

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                frequency: App.Config.BaseNote,
                transpose: 0,
                waveform: 2,
            };
        }

        /** Task: Create transpose feature
         *
         * All sources should have it
         * default is 0 (no transposition)
         * sliding scale between -12 and 12 (for first testing)
         * 1 being a semitone and 12 being a full octave
         *
         * a default tone is set to 440 (A)
         * if transpose is 3, tone should be 523.25 (C) (3+ semitones)
         *
         * If a keyboard is attached an A note would also then be transposed to C
         * When a keyboard calls SetPitch it needs to get the transpose number and take Math into account
         *
         * ie. keyboard pressed a 440 note, set Pitch should set to 523.25
         *
         * 440      0       440
         * 440      1       466.16
         * 440      2       493.88
         *
         * 440      12      880
         *
         *
         * intervalToFrequencyRatio(interval){
         *  Math.pow(2,(interval/12))
         * }
         *
         * The formula is:
         *
         * App.Config.BaseNote * intervalToFrequencyRatio(interval);
         */


        super.Init(sketch);

        this.CreateSource();
        this.CreateEnvelope();

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
            e.connect(this.EffectsChainInput);
        });

        this.Sources.forEach((s: Tone.Oscillator, i: number)=> {
            s.connect(this.Envelopes[i]);
            s.volume.value = -100;
            s.start();
        });

        // Define Outline for HitTest
        this.Outline.push(new Point(-2, 0), new Point(0, -2), new Point(2, 0), new Point(1, 1), new Point(-1, 1));
    }

    //TODO: move this
    interval2freq(interval: number): number {
        return Math.pow(2,(interval/12));
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
                        "min" : -12,
                        "max" : 12,
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

    SetParam(param: string,value: any) {


        var val = value;

        switch(param) {
            case "frequency":
                this.Sources[0].frequency.value = value;
                break;
            case 'transpose':
                this.Sources[0].frequency.value = this.Sources[0].frequency.value * this.interval2freq(value);
                break;
        }

        this.Params[param] = val;

        super.SetParam(param,value);
    }
}

export = ToneSource;