import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");
import PitchShifter = require("./PitchShifter");

class Pitch extends PostEffect {

    public Effect: PitchShifter;
    public Params: PitchShifterParams;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                pitchOffset: 0,
            };
        }

        this.Effect = new PitchShifter();


        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, -1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"pitch");
    }

    Dispose(){
        //this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="pitchOffset") {
            this.Effect.PitchOffset = value;
        }
        this.Params[param] = val;
    }


    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Phaser",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Pitch-shift",
                    "setting" :"pitchOffset",
                    "props" : {
                        "value" : this.Params.pitchOffset,
                        "min" : -1,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : true
                    }
                }
            ]
        };
    }
}

export = Pitch;