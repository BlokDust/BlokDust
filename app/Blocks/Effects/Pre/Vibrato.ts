//import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {IApp} from '../../../IApp';
import {LFObase} from './LFObase';

declare var App: IApp;

export class Vibrato extends LFObase {

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Vibrato.name;

        this.Defaults = {
            rate: 2,
            depth: 20,
            waveform: 2
        };

        this.PopulateParams();
        this.InitializeLFOs();

        super.init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2));
    }

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
    }

    UpdateOptionsForm() {

        this.OptionsForm =
        {
            "name" : "Vibrato",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.Params.rate,
                        "min" : 0,
                        "max" : 20,
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
                        "max" : 200,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "buttons",
                    "name" : "Wave",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.Params.waveform,
                        "mode" : "wave"
                    },
                    "buttons": [
                        {
                            "name" : "Sine"
                        },
                        {
                            "name" : "Square"
                        },
                        {
                            "name" : "Triangle"
                        },
                        {
                            "name" : "Saw"
                        }
                    ]
                }
            ]
        };
    }
}
