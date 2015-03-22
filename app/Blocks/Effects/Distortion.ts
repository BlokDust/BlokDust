import Effect = require("../Effect");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");

class Distortion extends Effect {

    public Effect: Tone.Distortion;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.Distortion(0.65);
        this.Effect.wet.value = 0.75;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
    }

    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"distortion");

    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        if (param=="dryWet") {
            this.Effect.wet.value = value;
        } else {
            this.Effect.distortion = value;
        }
    }

    GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="drive") {
            val = this.Effect.distortion;
        } else if (param=="dryWet") {
            val = this.Effect.wet.value;
        }
        return val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Distortion",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Drive",
                    "setting" :"drive",
                    "props" : {
                        "value" : this.GetParam("drive"),
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
                        "value" : this.GetParam("dryWet"),
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