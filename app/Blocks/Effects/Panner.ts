import Effect = require("../Effect");
import Grid = require("../../Grid");
import App = require("../../App");

class Panner extends Effect {

    public Effect: Tone.AutoPanner;

    constructor(grid: Grid, position: Point){

        this.Effect = new Tone.AutoPanner({
            "frequency": 1
        });

        super(grid, position);
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"panner");
    }

    Delete(){
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
        var val = this.Effect.getFrequency();
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name": "Auto Panner",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Frequency",
                    "setting": "frequency",
                    "props": {
                        "value": this.GetValue("frequency"),
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