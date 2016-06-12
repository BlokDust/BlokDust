import {IApp} from '../../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;

declare var App: IApp;

export class Volume extends PostEffect {

    public Effect: Tone.Volume;
    public Params: GainParams;
    public Defaults: GainParams;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Volume.name;

        this.Defaults = {
            gain: 0
        };
        this.PopulateParams();

        this.Effect = new Tone.Volume(this.Params.gain);

        super.init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(0, 1));
    }

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
    }

    Dispose(){
        this.Effect.dispose();
        this.Effect = null;
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        this.Effect.volume.value = value;
        this.Params[param] = value;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": App.L10n.Blocks.Effect.Blocks.Volume.name,
            "parameters": [
                {
                    "type" : "slider",
                    "name": "Level",
                    "setting": "gain",
                    "props": {
                        "value": this.Params.gain,
                        "min": -20,
                        "max": 20,
                        "quantised": false,
                        "centered": true,
                    }
                }
            ]
        };
    }
}
