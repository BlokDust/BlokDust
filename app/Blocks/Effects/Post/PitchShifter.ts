import {IApp} from '../../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;

declare var App: IApp;

export class PitchShifter extends PostEffect {

    public Effect: Tone.PitchShift;
    public Params: PitchShifterParams;
    public Defaults: PitchShifterParams;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.PitchShifter.name;

        this.Defaults = {
            mix: 0.5,
            pitchOffset: 6.9,
            windowSize: 0.07,
        };

        this.PopulateParams();

        this.Effect = new Tone.PitchShift(this.Params.pitchOffset);
        this.Effect.wet.value = this.Params.mix;

        super.init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, -1),new Point(0, 1));
    }

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        if (param=="pitchOffset") {
            this.Effect.pitch = value;
        } else if (param=="windowSize") {
            this.Effect.windowSize = value;
        } else if (param === "mix") {
            this.Effect.wet.value = value;
        }
        this.Params[param] = value;
    }


    UpdateOptionsForm() {

        this.OptionsForm =
        {
            "name" : App.L10n.Blocks.Effect.Blocks.PitchShifter.name,
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Pitchshift",
                    "setting" :"pitchOffset",
                    "props" : {
                        "value" : this.Params.pitchOffset,
                        "min" : -12,
                        "max" : 12,
                        "quantised" : false,
                        "centered" : true
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
                },
                //{
                //    "type" : "slider",
                //    "name" : "Pitchshift",
                //    "setting" :"windowSize",
                //    "props" : {
                //        "value" : this.Params.windowSize,
                //        "min" : 0.03,
                //        "max" : 0.1,
                //        "quantised" : false
                //    }
                //}
            ]
        };
    }
}