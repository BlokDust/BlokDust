import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {PostEffect} from '../PostEffect';

import {IApp} from "../../../IApp";

declare var App: IApp;

export class BitCrusher extends PostEffect {

    public Effect: Tone.BitCrusher;
    public Params: BitCrusherParams;
    public Defaults: BitCrusherParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.BitCrusher.name;

        this.Defaults = {
            bits: 7,
            mix: 0.5
        };
        this.PopulateParams();

        this.Effect = new Tone.BitCrusher(this.Params.bits);

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(1, -2),new Point(1, 0),new Point(0, 1),new Point(-1, 1));

    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    Dispose() {
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        if (param === 'bits') {
            this.Effect.bits = value; //TODO: make rampable, creates some ugly pops jumping extreme values
            //this.Effect.bits.rampTo(value,0.01);
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
