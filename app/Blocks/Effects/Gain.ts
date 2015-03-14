import App = require("../../App");
import Effect = require("../Effect");
import Grid = require("../../Grid");
import AudioSettings = require("../../Core/Audio/AudioSettings");

class Gain extends Effect {

    //public Effect: GainNode;
    public Effect: Tone.Signal;

    constructor(grid: Grid, position: Point){

        //this.Effect = App.AudioMixer.Master.context.createGain();
        //this.Effect.gain.value = 1.2;

        this.Effect = new Tone.Signal(1, 'db');


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

        //this.Effect.gain.value = (value/10)+1;
        this.Effect.rampTo(value, 0.1);
    }

    GetValue(param: string) {
        super.GetValue(param);


        if (param === "gain") {
            //var val = (this.Effect.gain.value-1)*10;
            var val = this.Effect.value;
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
                        //"min": -10,
                        //"max": 10,
                        "min": 0.01,
                        "max": 20,
                        "quantised": false,
                        "centered": true,
                    }
                }
            ]
        };
    }
}

export = Gain;