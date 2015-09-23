import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import MainScene = require("../../../MainScene");
import ISketchContext = Fayde.Drawing.ISketchContext;

class Gain extends PostEffect {

    public Effect: GainNode;
    //public Effect: Tone.Signal;
    public Gain: GainParams;

    Init(sketch: ISketchContext): void {

        if (!this.Params) {
            this.Params = {
                gain: 1.2
            };
        }

        this.Effect = App.Audio.ctx.createGain();
        this.Effect.gain.value = (this.Params.gain/10)+1;

        //this.Effect = new Tone.Signal(1, 'db');


        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"volume");
    }

    Dispose(){
        this.Effect.disconnect();
        this.Effect = null;
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        this.Effect.gain.value = (value/10)+1;
        this.Params[param] = value;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "Volume",
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