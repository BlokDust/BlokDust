import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import MainScene = require("../../../MainScene");

class BitCrusher extends PostEffect {

    public Effect: Tone.BitCrusher;
    public Params: BitCrusherParams;

    Init(sketch?: any): void {

        if (!this.Params) {
            this.Params = {
                bits: 7,
                mix: 0.5,
            };
        }

        this.Effect = new Tone.BitCrusher(this.Params.bits);

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(1, -2),new Point(1, 0),new Point(0, 1),new Point(-1, 1));

    }

    Draw() {
        super.Draw();

        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"bit crusher");

    }


    Dispose() {
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        if (param === 'bits') {
            this.Effect.bits = value;
        } else if (param === 'mix') {
            this.Effect.wet.value = value;
        }

        this.Params[param] = value;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Bit Crusher",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Bits",
                    "setting" : "bits",
                    "props" : {
                        "value" : this.Params.bits,
                        "min" : 1,
                        "max" : 8,
                        "quantised" : false,
                        "centered" : false
                    }
                },

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

export = BitCrusher;