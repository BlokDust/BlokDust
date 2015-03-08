import Effect = require("../Effect");
import Grid = require("../../Grid");
import App = require("../../App");

class Delay extends Effect {

    public Effect: Tone.PingPongDelay;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.PingPongDelay('8n');
        this.Effect.setFeedback(0.4);
        this.Effect.dryWet.setDry(0.5);

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2),new Point(0, 1),new Point(-1, 2));
    }

    Draw() {
        super.Draw();
        (<Grid>this.Sketch).BlockSprites.Draw(this.Position,true,"delay");
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
        if (param=="delayTime") {
            val = this.Effect.getDelayTime();
        } else if (param=="feedback") {
            val = this.Effect.getFeedback();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Delay",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Delay Time",
                    "setting" :"delayTime",
                    "props" : {
                        "value" : this.GetValue("delayTime"),
                        "min" : 0.05,
                        "max" : 0.5,
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
                        "max" : 0.9,
                        "quantised" : false,
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

export = Delay;