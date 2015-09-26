import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import ISketchContext = Fayde.Drawing.ISketchContext;

export class Phaser extends PostEffect {

    public Effect: Tone.Phaser;
    public Params: PhaserParams;

    Init(sketch: ISketchContext): void {

        if (!this.Params) {
            this.Params = {
                rate: 0.5,
                depth: 9,
                baseFrequency: 500,
                mix: 0.75
            };
        }

        this.Effect = new Tone.Phaser({
            "rate" : this.Params.rate,
            "depth" : this.Params.depth,
            "Q" : 0.1,
            "baseFrequency" : this.Params.baseFrequency
        });
        this.Effect.wet.value = this.Params.mix;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(-1, -2),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.DrawSprite(this.Position,true,"phaser");
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="mix") {
            this.Effect.wet.value = val;
        } else if (param=="rate") {
            this.Effect.frequency.value = val;
        } else {
            this.Effect[param] = val;
        }

        this.Params[param] = val;
    }

    /*GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="rate") {
            val = this.Effect.frequency.value;
        } else if (param=="depth") {
            val = this.Effect.depth;
        } else if (param=="baseFrequency") {
            val = this.Effect.baseFrequency;
        } else if (param=="dryWet") {
            val = this.Effect.wet.value;
        }
        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Phaser",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.Params.rate,
                        "min" : 0,
                        "max" : 10,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Depth",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.Params.depth,
                        "min" : 0,
                        "max" : 10,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Frequency",
                    "setting" :"baseFrequency",
                    "props" : {
                        "value" : this.Params.baseFrequency,
                        "min" : 10,
                        "max" : 2000,
                        "quantised" : true,
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
