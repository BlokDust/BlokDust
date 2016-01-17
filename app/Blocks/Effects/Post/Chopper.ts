import {IApp} from '../../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import Point = etch.primitives.Point;

declare var App: IApp;

export class Chopper extends PostEffect {

    public Effect: Tone.Tremolo;
    public Params: ChopperParams;
    public Defaults: ChopperParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Effect.Blocks.Chopper.name;

        this.Defaults = {
            rate: 8,
            depth: 1,
            spread: 0,
            waveform: 2,
            mix: 1
        };
        this.PopulateParams();

        this.Effect = new Tone.Tremolo({
            'frequency': this.Defaults.rate,
            'depth': this.Defaults.depth,
            'spread': this.Defaults.spread,
            'type': App.Audio.WaveformTypeIndex[this.Defaults.waveform],
            'wet': this.Defaults.mix,
        }).start();

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    Dispose(){
        this.Effect.stop();
        this.Effect.dispose();
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "Chopper",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Rate",
                    "setting": "rate",
                    "props": {
                        "value": this.Params.rate,
                        "min": 0,
                        "max": 50,
                        "quantised": false,
                        "centered": false
                    }
                },
                {
                    "type" : "slider",
                    "name": "Depth",
                    "setting": "depth",
                    "props": {
                        "value": this.Params.depth,
                        "min": 0,
                        "max": 1,
                        "quantised": false,
                        "centered": false
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
                },
                {
                    "type" : "slider",
                    "name": "Spread",
                    "setting": "spread",
                    "props": {
                        "value": this.Params.spread,
                        "min": 0,
                        "max": 180,
                        "quantised": false,
                        "centered": false
                    }
                },
            ]
        };
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        switch (param) {
            case "rate":
                this.Effect.frequency.value = value;
                break;
            case "depth":
                this.Effect.depth.value = value;
                break;
            case "waveform":
                this.Effect.type = App.Audio.WaveformTypeIndex[value];
                break;
            case "spread":
                this.Effect.spread = value;
                break;
        }

        this.Params[param] = value;
    }
}
