import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import ISketchContext = Fayde.Drawing.ISketchContext;

export class Distortion extends PostEffect {

    public Effect: Tone.Distortion;
    public Params: DistortionParams;

    Init(sketch: ISketchContext): void {

        if (!this.Params) {
            this.Params = {
                drive: 0.65,
                mix: 0.75
            };
        }

        this.Effect = new Tone.Distortion(this.Params.drive);
        this.Effect.wet.value = this.Params.mix;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
    }

    Draw() {
        super.Draw();

        (<MainScene>this.Sketch).BlockSprites.DrawSprite(this.Position,true,"distortion");

    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="mix") {
            this.Effect.wet.value = val;
        } else {
            this.Effect.distortion = val;
        }

        this.Params[param] = val;
    }

/*    GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="drive") {
            val = this.Effect.distortion;
        } else if (param=="dryWet") {
            val = this.Effect.wet.value;
        }
        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Distortion",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Drive",
                    "setting" :"drive",
                    "props" : {
                        "value" : this.Params.drive,
                        "min" : 0.1,
                        "max" : 1,
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
