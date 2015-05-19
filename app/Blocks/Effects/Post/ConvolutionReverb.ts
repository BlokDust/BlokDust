import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");

class Convolver extends PostEffect {

    public Effect: Tone.Convolver;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                sample: "../Assets/ImpulseResponses/teufelsberg01.wav",
                mix: 1
            };
        }

        this.Effect = new Tone.Convolver(this.Params.sample);

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(2, 0),new Point(0, 2),new Point(-1, 1));
        console.log(this);
    }

    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"convolution");
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="mix") {
            this.Effect.wet.value = val;
        }

        this.Params[param] = val;
    }

    /*GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="dryWet") {
            val = this.Effect.wet.value;
        }
        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Convolver",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Mix",
                    "setting" :"mix",
                    "props" : {
                        "value" : this.Params.mix,
                        "min" : 0,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }
}

export = Convolver;