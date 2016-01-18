//import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {IApp} from '../../../IApp';
import {LFObase} from './LFObase';

declare var App: IApp;

export class Scuzz extends LFObase {

    public Params: ScuzzParams;
    public Defaults: ScuzzParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Scuzz.name;

        this.Defaults = {
            depth: 1000,
            rate: 100,
            waveform: 2
        };
        this.PopulateParams();
        this.InitializeLFOs();

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(2, -1),new Point(0, 1),new Point(-1, 0));
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    Dispose(){
        this.OscLFO.stop();
        this.SamplerLFO.stop();
        this.OscLFO.dispose();
        this.SamplerLFO.dispose();
    }

    UpdateOptionsForm() {

        this.OptionsForm =
        {
            "name" : "Scuzz",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Power",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.Params.depth,
                        "min" : 1000,
                        "max" : 10000,
                        "quantised" : true,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Pulverisation",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.Params.rate,
                        "min" : 100,
                        "max" : 10000,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }
}
