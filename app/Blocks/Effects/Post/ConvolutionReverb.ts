import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");

class Convolver extends PostEffect {

    public Effect: Tone.Convolver;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.Convolver("../Assets/ImpulseResponses/teufelsberg01.wav");

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
        var jsonVariable = {};
        jsonVariable[param] = value;
        if (param=="dryWet") {
            this.Effect.wet.value = value;
        }
    }

    GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="dryWet") {
            val = this.Effect.wet.value;
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.OptionsForm =
        {
            "name" : "Convolver",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Mix",
                    "setting" :"dryWet",
                    "props" : {
                        "value" : this.GetParam("dryWet"),
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