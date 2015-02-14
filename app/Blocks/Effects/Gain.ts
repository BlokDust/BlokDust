import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import Grid = require("../../Grid");
import AudioSettings = require("../../Core/Audio/AudioSettings");

class Gain extends Modifier {

    public Effect: Tone.Signal;
    public Settings: ToneSettings = new AudioSettings();

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Effect = new Tone.Signal();

        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(0, 1));
    }

    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"gain");
    }

    Delete(){
        this.Effect.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);

        if (param == "gain") {
            //TODO: DO SOME MATH TO MAKE THE NUMBERS BETTER
            value  = (value + 10) * 0.5;
        }

        this.Effect.output.gain.value = value;
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val = (this.Effect.output.gain.value * 2) - 10;
        return val;
    }

    OpenParams() {
        super.OpenParams();



        this.ParamJson =
        {
            "name": "Gain",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Gain",
                    "setting": "gain",
                    "props": {
                        "value": this.GetValue("gain"),
                        "min": -10,
                        "max": 10,
                        "quantised": false,
                        "centered": true
                    }
                }
            ]
        };
    }
}

export = Gain;