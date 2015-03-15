import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import Effect = require("../Effect");
import Block = require("../Block");
import Type = require("../BlockType");
import BlockType = Type.BlockType;
import Particle = require("../../Particle");

class ToneSource extends Source {

    public Frequency: number;
    public Envelope: Tone.AmplitudeEnvelope;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.BlockType = BlockType.ToneSource;
        this.Frequency = 440;
        this.Source = new Tone.Oscillator(this.Frequency, 'sawtooth');

        super.Init(sketch);

        this.Envelope = new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        );

        this.Envelope.connect(this.EffectsChainInput);
        this.Source.connect(this.Envelope).start();

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

    TriggerAttack(){
        super.TriggerAttack();
        if(!this.IsPowered()){
            this.Envelope.triggerAttack();
        }
    }

    TriggerRelease(){
        super.TriggerRelease();
        if(!this.IsPowered()){
            this.Envelope.triggerRelease();
        }
    }

    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);

        // USE SIGNAL? So we can schedule a sound length properly
        // play tone
        this.Envelope.triggerAttackRelease(0.1);

        particle.Dispose();
    }

    Dispose() {
        super.Dispose();
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"tone");
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Tone",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Frequency",
                    "setting" :"frequency",
                    "props" : {
                        "value" : this.GetValue("frequency"),
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
                        "value" : this.GetValue("waveform"),
                        "min" : 1,
                        "max" : 4,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

    SetValue(param: string,value: any) {

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

            // Set waveforms on PolySources
            for(var i = 0; i<this.PolySources.length; i++){
                this.PolySources[i].type = value;
            }

        } else if (param == "frequency") {
            this.Frequency = value;
        }

        super.SetValue(param,value);
    }

    GetValue(param: string){
        var val;
        if (param == "waveform") {
            switch(super.GetValue(param)){
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
            val = super.GetValue(param)
        }
        return val;
    }
}

export = ToneSource;