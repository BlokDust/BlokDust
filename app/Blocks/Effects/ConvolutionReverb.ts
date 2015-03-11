import Effect = require("../Effect");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");

class Convolver extends Effect {

    public Effect: Tone.Convolver;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.Convolver("../Assets/ImpulseResponses/teufelsberg01.wav");

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(2, 0),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"convolution");
    }

    Delete(){
        this.Effect.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        if (param=="dryWet") {
            this.Effect.dryWet.setWet(value);
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="dryWet") {
            val = this.Effect.getWet();
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Convolver",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Mix",
                    "setting" :"dryWet",
                    "props" : {
                        "value" : this.GetValue("dryWet"),
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