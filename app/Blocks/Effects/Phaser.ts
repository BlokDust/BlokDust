import Effect = require("../Effect");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");

class Phaser extends Effect {

    public Effect: Tone.Phaser;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.Phaser({
            "rate" : 0.5,
            "depth" : 9,
            "Q" : 0.1,
            "baseFrequency" : 500
        });

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(-1, -2),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"phaser");
    }

    Delete(){
        this.Effect.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        if (param=="dryWet") {
            this.Effect.dryWet.setWet(value);
        } else {
            this.Effect.set(
                jsonVariable
            );
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="rate") {
            val = this.Effect.getRate();
        } else if (param=="depth") {
            val = this.Effect.getDepth();
        } else if (param=="baseFrequency") {
            val = this.Effect.getBaseFrequency();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Phaser",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.GetValue("rate"),
                        "min" : 0,
                        "max" : 10,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Depth",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.GetValue("depth"),
                        "min" : 0,
                        "max" : 10,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Frequency",
                    "setting" :"baseFrequency",
                    "props" : {
                        "value" : this.GetValue("baseFrequency"),
                        "min" : 10,
                        "max" : 2000,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Mix",
                    "setting" :"dryWet",
                    "props" : {
                        "value" : this.GetValue("dryWet"),
                        "min" : 0,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }
}

export = Phaser;