import Effect = require("../Effect");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");

class Panner extends Effect {

    public Effect: Tone.AutoPanner;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.AutoPanner({
            "frequency": 1
        });

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"panner");
    }

    Dispose(){
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
        var val = this.Effect.frequency.value;
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.OptionsForm =
        {
            "name": "Auto Panner",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Frequency",
                    "setting": "frequency",
                    "props": {
                        "value": this.GetParam("frequency"),
                        "min": 0,
                        "max": 5,
                        "quantised": false,
                        "centered": false
                    }
                }
            ]
        };
    }
}

export = Panner;