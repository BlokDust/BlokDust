import Effect = require("../Effect");
import Grid = require("../../Grid");
import App = require("../../App");

class Reverb extends Effect {

    public Effect: Tone.Freeverb;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.Freeverb(0.7, 0.5);

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(2, 0),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();
        (<Grid>this.Sketch).BlockSprites.Draw(this.Position,true,"reverb");
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
        } else if (param=="dampening") {
            this.Effect.setDampening(value);
        } else if (param=="roomSize") {
            this.Effect.setRoomSize(value);
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="dryWet") {
            val = this.Effect.getWet();
        } else if (param=="dampening") {
            val = this.Effect.getDampening();
        } else if (param=="roomSize") {
            val = this.Effect.getRoomSize();
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Reverb",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Dampening",
                    "setting" :"dampening",
                    "props" : {
                        "value" : this.GetValue("dampening"),
                        "min" : 0.1,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Room Size",
                    "setting" :"roomSize",
                    "props" : {
                        "value" : this.GetValue("roomSize"),
                        "min" : 0.1,
                        "max" : 0.95,
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

export = Reverb;