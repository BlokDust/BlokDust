import Effect = require("../Effect");
import Grid = require("../../Grid");
import App = require("../../App");

class Distortion extends Effect {

    public Effect: Tone.Distortion;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.Distortion(0.65);
        this.Effect.dryWet.setWet(0.75);

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
    }

    Draw() {
        super.Draw();

        (<Grid>this.Sketch).BlockSprites.Draw(this.Position,true,"distortion");

    }

    Delete(){
        this.Effect.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        if (param=="dryWet") {
            this.Effect.dryWet.setWet(value);
        } else {
            this.Effect.setDistortion(value);
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="drive") {
            val = this.Effect.getDistortion();
        } else if (param=="dryWet") {
            val = this.Effect.getWet();
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Distortion",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Drive",
                    "setting" :"drive",
                    "props" : {
                        "value" : this.GetValue("drive"),
                        "min" : 0.1,
                        "max" : 1,
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

export = Distortion;