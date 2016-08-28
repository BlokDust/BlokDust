import IDisplayContext = etch.drawing.IDisplayContext;
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;
import {IApp} from "../../../IApp";

declare var App: IApp;

export class Filter extends PostEffect {

    public Effect: Tone.Filter;
    public Params: FilterParams;
    public Defaults: FilterParams;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Filter.name;

        this.Defaults = {
            frequency: 440,
            gain: 0
        };
        this.PopulateParams();

        this.Effect = new Tone.Filter({
            "type" : "peaking",
            "frequency" : this.Params.frequency,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : this.Params.gain
        });


        super.init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -2),new Point(1, 0),new Point(1, 2),new Point(-1, 0));
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

        this.Effect[param].value = val;

        this.Params[param] = val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": App.L10n.Blocks.Effect.Blocks.Filter.name,
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Frequency",
                    "setting": "frequency",
                    "props": {
                        "value": this.Params.frequency,
                        "min": 20,
                        "max": 20000,
                        "quantised": true,
                        "centered": false,
                        "logarithmic": true
                    }
                },

                {
                    "type" : "slider",
                    "name": "Gain",
                    "setting": "gain",
                    "props": {
                        "value": this.Params.gain,
                        "min": -35,
                        "max": 35,
                        "quantised": false,
                        "centered": true
                    }
                }
            ]
        };
    }
}
