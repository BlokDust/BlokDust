import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;

import {IApp} from "../../../IApp";

declare var App: IApp;

export class Chorus extends PostEffect {

    public Defaults: ChorusParams;
    public Effect: Tone.Chorus;
    public Params: ChorusParams;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Chorus.name;

        this.Defaults = {
            rate: 1.5,
            delayTime: 1.5,
            depth: 0.75,
            feedback: 0.4
        };
        this.PopulateParams();


        this.Effect = new Tone.Chorus({
            "frequency" : this.Params.rate,
            "delayTime" : this.Params.delayTime,
            "type" : 'sine',
            "depth" : this.Params.depth,
            "feedback" : this.Params.feedback
        });

        super.init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(0, -1),new Point(1, 0),new Point(0, 1),new Point(-1, 1));
    }

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
    }

    Dispose() {
        this.Effect.dispose();
    }


    SetParam(param: string,value: number) {
        var val = value;

        if (param === "rate") {
            this.Effect.frequency.value = val;
        } else if (param === "feedback") {
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
            "name" : App.L10n.Blocks.Effect.Blocks.Chorus.name,
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
                        "min" : 0.5,
                        "max" : 8,
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
                        "max" : 0.496, // higher than 0.496 can easily cause the audio to die of feedback
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }
}
