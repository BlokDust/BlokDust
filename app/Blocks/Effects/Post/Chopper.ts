import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import MainScene = require("../../../MainScene");
import ISketchContext = Fayde.Drawing.ISketchContext;

class Chopper extends PostEffect {

    public Polarity: number;
    public Transport;
    public Timer;
    public Effect: GainNode;
    public Params: ChopperParams;

    Init(sketch: ISketchContext): void {

        this.Effect = App.Audio.ctx.createGain();

        if (!this.Params) {
            this.Params = {
                rate: 50,
                depth: 4,
            };
        }

        this.Polarity = 0;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));

        this.SetVolume();
    }

    SetVolume() {
        var me = this;
        this.Timer = setTimeout(function() {
            if (me.Effect) {
                if (me.Polarity==0) {
                    me.Effect.gain.value = ((5-me.Params.depth)/5);
                    me.Polarity = 1;
                } else {
                    me.Effect.gain.value = 1;
                    me.Polarity = 0;
                }
                me.SetVolume();
            }

        },this.Params.rate);
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"chopper");
    }

    Dispose(){
        //this.Transport.stop();
        clearTimeout(this.Timer);
        this.Effect.disconnect();
        this.Effect = null;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "Chopper",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Rate",
                    "setting": "rate",
                    "props": {
                        "value": Math.round(151-this.Params.rate),
                        "min": 1,
                        "max": 125,
                        "quantised": true,
                        "centered": false
                    }
                },

                {
                    "type" : "slider",
                    "name": "Depth",
                    "setting": "depth",
                    "props": {
                        "value": this.Params.depth,
                        "min": 0,
                        "max": 5,
                        "quantised": false,
                        "centered": false
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param == "rate") {
            val = Math.round(151-value);
        }

        this.Params[param] = val;
    }
}

export = Chopper;