import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import AudioSettings = require("../../../Core/Audio/AudioSettings");
import BlocksSketch = require("../../../BlocksSketch");

class Gain extends PostEffect {

    public Effect: GainNode;
    //public Effect: Tone.Signal;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                gain: 1.2
            };
        }

        this.Effect = App.AudioMixer.Master.context.createGain();
        this.Effect.gain.value = this.Params.gain;

        //this.Effect = new Tone.Signal(1, 'db');


        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"gain");
    }

    Dispose(){
        this.Effect.disconnect();
        this.Effect = null;
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        this.Effect.gain.value = (val/10)+1;

        this.Params[param] = val;
    }

    /*GetParam(param: string) {
        super.GetParam(param);


        if (param === "gain") {
            var val = (this.Effect.gain.value-1)*10;
            //var val = this.Effect.value;
        }

        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "Gain",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Gain",
                    "setting": "gain",
                    "props": {
                        "value": this.Params.gain,
                        "min": -10,
                        "max": 10,
                        //"min": 0.01,
                        //"max": 80,
                        "quantised": false,
                        "centered": true
                    }
                }
            ]
        };
    }
}

export = Gain;