import App = require("../../App");
import Effect = require("../Effect");
import Grid = require("../../Grid");
import AudioSettings = require("../../Core/Audio/AudioSettings");

class Gain extends Effect {

    public Effect: GainNode;


    constructor(grid: Grid, position: Point){

        this.Effect = App.AudioMixer.Master.context.createGain();
        this.Effect.gain.value = 0.5;
        this.SetValue("gain", 0.1);

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"gain");
    }

    Delete(){
        this.Effect.disconnect();
        this.Effect = null;
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);

        if (param == "gain") {
            //TODO: DO SOME MATH TO MAKE THE NUMBERS BETTER
            value  = (value + 6) * 0.5;
        }

        this.Effect.gain.value = value;
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;

        if (param == "gain") {
            val = (this.Effect.gain.value * 2) - 6;
        }
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