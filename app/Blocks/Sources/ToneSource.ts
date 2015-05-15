import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import Effect = require("../Effect");
import Block = require("../Block");
import Particle = require("../../Particle");

class ToneSource extends Source {

    public Sources: Tone.Oscillator[];
    public Frequency: number;
    public Waveform: string;
    public Envelopes: Tone.AmplitudeEnvelope[];

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Frequency = 440;
        this.Waveform = 'sawtooth';


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


        this.Width = 150;
        this.Height = 150;

        // Define Outline for HitTest
        this.Outline.push(new Point(-2, 0), new Point(0, -2), new Point(2, 0), new Point(1, 1), new Point(-1, 1));
    }

    MouseDown() {
        super.MouseDown();

        this.TriggerAttack();
    }

    MouseUp() {
        super.MouseUp();

        this.TriggerRelease();
    }

    CreateSource(){
        super.CreateSource();

        // add it to the list of sources
        this.Sources.push( new Tone.Oscillator(this.Frequency, this.Waveform));

        // return it
        return this.Sources[this.Sources.length-1];
    }

    CreateEnvelope(){
        super.CreateEnvelope();
        this.Envelopes.push( new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        ));
        
        return this.Envelopes[this.Envelopes.length-1];
    }

    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);

        // USE SIGNAL? So we can schedule a sound length properly
        // play tone
        this.Envelopes.forEach((e: any)=> {
            e.triggerAttackRelease(0.1);
        });

        particle.Dispose();
    }

    Dispose() {
        super.Dispose();
        this.Frequency = null;

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
                        "value" : this.GetParam("frequency"),
                        "min" : 10,
                        "max" : 15000,
                        "quantised" : true,
                        "centered" : false,
                        "logarithmic": true
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Waveform",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.GetParam("waveform"),
                        "min" : 1,
                        "max" : 4,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: any) {

        if (param == "waveform") {
            switch(Math.round(value)){
                case 1: value = "sine";
                    break;
                case 2: value = "square";
                    break;
                case 3: value = "triangle";
                    break;
                case 4: value = "sawtooth";
                    break;
            }
            this.Waveform = value;

        } else if (param == "frequency") {
            this.Frequency = value;
        }

        super.SetParam(param,value);
    }

    GetParam(param: string){
        var val;
        if (param == "waveform") {
            switch(super.GetParam(param)){
                case "sine": val = 1;
                    break;
                case "square": val = 2;
                    break;
                case "triangle": val = 3;
                    break;
                case "sawtooth": val = 4;
                    break;
            }
        } else {
            val = super.GetParam(param)
        }
        return val;
    }
}

export = ToneSource;