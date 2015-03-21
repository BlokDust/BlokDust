import Effect = require("../Effect");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");

class Chorus extends Effect {

    public Effect: Tone.Chorus;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.Chorus({
            "rate" : 1,
            "delayTime" : 2.5,
            "type" : 'triangle',
            "depth" : 0.4,
            "feedback" : 0.2
        });

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(0, -1),new Point(1, 0),new Point(0, 1),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"chorus");
    }

    Dispose() {
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        this.Effect.set(
            jsonVariable
        );
    }

    GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="rate") {
            val = this.Effect.frequency.value;
        } else if (param=="delayTime") {
            val = this.Effect.delayTime;
        } else if (param=="depth") {
            val = this.Effect.depth;
        } else if (param=="feedback") {
            val = this.Effect.feedback.value;
        }

        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.OptionsForm =
        {
            "name" : "Chorus",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.GetParam("rate"),
                        "min" : 0,
                        "max" : 5,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Delay Time",
                    "setting" :"delayTime",
                    "props" : {
                        "value" : this.GetParam("delayTime"),
                        "min" : 0,
                        "max" : 5,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Depth",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.GetParam("depth"),
                        "min" : 0,
                        "max" : 3,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Feedback",
                    "setting" :"feedback",
                    "props" : {
                        "value" : this.GetParam("feedback"),
                        "min" : 0,
                        "max" : 0.2,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }
}

export = Chorus;