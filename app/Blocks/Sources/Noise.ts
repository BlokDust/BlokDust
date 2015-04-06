import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import Particle = require("../../Particle");

class Noise extends Source {

    public PlaybackRate: number;
    public DelayedRelease: number;
    public Noise: any;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Sources.push( new Tone.Noise('brown') );
        this.PlaybackRate = 1;

        super.Init(sketch);

        this.Envelopes.push( new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        ));

        this.Envelopes.forEach((e: any)=> {
            e.connect(this.EffectsChainInput);
        });

        this.Sources.forEach((s: any, i:number)=> {
            s.connect(i).start();
        });


        this.DelayedRelease = 0;

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
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
        this.Envelopes.forEach((e: any)=> {
            e.triggerAttack();
        });
    }

    TriggerRelease(){
        super.TriggerRelease();
        if(!this.IsPowered()){
            this.Envelopes.forEach((e: any)=> {
                e.triggerRelease();
            });
        }
    }

    TriggerAttackRelease(){
        super.TriggerAttackRelease();
    }

    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);

        // USE SIGNAL? So we can schedule a sound length properly
        // play tone
        this.Envelopes.forEach((e: any)=> {
            e.triggerAttack();
        });

        this.DelayedRelease = 5; //TODO, THIS IS SHIT

        particle.Dispose();
    }

    Update() {
        super.Update();

        if (this.DelayedRelease>0) { //TODO, THIS IS SHIT
            this.DelayedRelease -= 1;
            if (this.DelayedRelease==0) {
                this.Envelopes.forEach((e: any)=> {
                    e.triggerRelease();
                });
            }
        }
    }

    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"noise");
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Noise",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Waveform",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.GetParam("waveform"),
                        "min" : 1,
                        "max" : 3,
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
                case 1: value = "white";
                    break;
                case 2: value = "pink";
                    break;
                case 3: value = "brown";
                    break;
            }
        }

        super.SetParam(param,value);
    }

    GetParam(param: string){
        var val;
        if (param == "waveform") {
            switch(super.GetParam(param)){
                case "white": val = 1;
                    break;
                case "pink": val = 2;
                    break;
                case "brown": val = 3;
                    break;
            }
        } else {
            val = super.GetParam(param)
        }
        return val;
    }

    Dispose() {
        super.Dispose();

        this.Sources.forEach((s: any, i:number)=> {
            s.dispose();
        });

        this.Envelopes.forEach((e: any, i:number)=> {
            e.dispose();
        });

        this.PlaybackRate = null;
    }
}

export = Noise;