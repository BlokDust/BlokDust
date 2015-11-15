import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;

export class Panner extends PostEffect {

    public Effect: Tone.AutoPanner;

    Init(drawTo: IDisplayContext): void {

        if (!this.Params) {
            this.Params = {
                frequency: 1
            };
        }

        this.Effect = new Tone.AutoPanner({
            "frequency": this.Params.frequency
        });

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        this.DrawSprite("panner");
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        this.Effect.frequency.value = (val/10)+1;

        this.Params[param] = val;
    }

    /*GetParam(param: string) {
        super.GetParam(param);
        var val = this.Effect.frequency.value;
        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "Auto Panner",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Frequency",
                    "setting": "frequency",
                    "props": {
                        "value": this.Params.frequency,
                        "min": 0,
                        "max": 5,
                        "quantised": false,
                        "centered": false
                    }
                }
            ]
        };
    }
}
