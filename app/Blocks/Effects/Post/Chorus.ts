import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;

export class Chorus extends PostEffect {

    public Defaults: ChorusParams;
    public Effect: Tone.Chorus;
    public Params: ChorusParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = "Chorus";

        this.Defaults = {
            rate: 1.5,
            delayTime: 1.5,
            depth: 0.75,
            feedback: 0.4
        };
        this.PopulateParams();


        this.Effect = new Tone.Chorus({
            "rate" : this.Params.rate,
            "delayTime" : this.Params.delayTime,
            "type" : 'sine',
            "depth" : this.Params.depth,
            "feedback" : this.Params.feedback
        });

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(0, -1),new Point(1, 0),new Point(0, 1),new Point(-1, 1));
    }

    Draw() {
        super.Draw();
        this.DrawSprite("chorus");
    }

    Dispose() {
        this.Effect.dispose();
    }


    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="rate") {
            this.Effect.frequency.value = val;
        } else if (param=="feedback") {
            this.Effect.feedback.value = val;
        } else {
            this.Effect[param] = val;
        }

        this.Params[param] = val;
    }


    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Chorus",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.Params.rate,
                        "min" : 0,
                        "max" : 5,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Delay Time",
                    "setting" :"delayTime",
                    "props" : {
                        "value" : this.Params.delayTime,
                        "min" : 0,
                        "max" : 5,
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
                        "max" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Feedback",
                    "setting" :"feedback",
                    "props" : {
                        "value" : this.Params.feedback,
                        "min" : 0,
                        "max" : 0.8,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }
}
