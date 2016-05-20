import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;
import {IApp} from "../../../IApp";

declare var App: IApp;

export class Phaser extends PostEffect {

    public Effect: Tone.Phaser;
    public Params: PhaserParams;
    public Defaults: PhaserParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Phaser.name;

        this.Defaults = {
            rate: 1.8,
            depth: 3.2,
            baseFrequency: 400,
            mix: 0.5
        };

        this.PopulateParams();

        this.Effect = new Tone.Phaser({
            "frequency" : this.Params.rate,
            "octaves" : this.Params.depth,
            "Q" : 1,
            "baseFrequency" : this.Params.baseFrequency
        });
        this.Effect.wet.value = this.Params.mix;

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(-1, -2),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();
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
        } else if (param=="rate") {
            this.Effect.frequency.value = val;
        } else if (param=="depth") {
            this.Effect.octaves = val;
        } else {
            this.Effect[param] = val;
        }

        this.Params[param] = val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : App.L10n.Blocks.Effect.Blocks.Phaser.name,
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
                    "name" : "Width",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.Params.depth,
                        "min" : 1,
                        "max" : 10,
                        "quantised" : false,
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
