import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;
import {IApp} from "../../../IApp";

declare var App: IApp;

export class Distortion extends PostEffect {

    public Effect: Tone.Distortion;
    public Params: DistortionParams;
    public Defaults: DistortionParams;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Distortion.name;

        this.Defaults = {
            drive: 0.65,
            mix: 0.75
        };
        this.PopulateParams();

        this.Effect = new Tone.Distortion(this.Params.drive);
        this.Effect.wet.value = this.Params.mix;

        super.init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
    }

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
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

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : App.L10n.Blocks.Effect.Blocks.Distortion.name,
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
