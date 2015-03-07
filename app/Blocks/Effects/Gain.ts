import App = require("../../App");
import Effect = require("../Effect");
import Grid = require("../../Grid");
import AudioSettings = require("../../Core/Audio/AudioSettings");

class Gain extends Effect {

    public Effect: GainNode;


    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Effect = App.GetInstance().AudioMixer.Master.context.createGain();
        this.Effect.gain.value = 1.2;

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

        this.Effect.gain.value = (value/10)+1;
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val = (this.Effect.gain.value-1)*10;

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