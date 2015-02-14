import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import App = require("../../App");

class Chorus extends Modifier {

    public Effect: Tone.Chorus;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Effect = new Tone.Chorus({
            "rate" : 1,
            "delayTime" : 2.5,
            "type" : 'triangle',
            "depth" : 0.4,
            "feedback" : 0.2
        });

        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(0, -1),new Point(1, 0),new Point(0, 1),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"chorus");
    }

    Delete() {
        this.Effect.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        this.Effect.set(
            jsonVariable
        );
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="rate") {
            val = this.Effect.getRate();
        } else if (param=="delayTime") {
            val = this.Effect.getDelayTime();
        } else if (param=="depth") {
            val = this.Effect.getDepth();
        } else if (param=="feedback") {
            val = this.Effect.getFeedback();
        }

        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Chorus",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.GetValue("rate"),
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
                        "value" : this.GetValue("delayTime"),
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
                        "value" : this.GetValue("depth"),
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
                        "value" : this.GetValue("feedback"),
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