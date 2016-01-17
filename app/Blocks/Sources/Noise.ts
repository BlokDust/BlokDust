import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {IApp} from '../../IApp';
import {MainScene} from '../../MainScene';
import {Source} from '../Source';

declare var App: IApp;

export class Noise extends Source {

    public DelayedRelease: number;
    public Noise: any;
    public Params: NoiseParams;
    public Defaults: NoiseParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.Noise.name;

        //this.Waveform = 'brown'; // is this being updated from save if not brown?

        this.Defaults = {
            playbackRate: 1,
            waveform: 2
        };
        this.PopulateParams();

        super.Init(drawTo);

        this.CreateSource();
        this.CreateEnvelope();

        this.Envelopes.forEach((e: any)=> {
            e.connect(this.AudioInput);
        });

        this.Sources.forEach((s: any, i:number)=> {
            s.connect(this.Envelopes[i]).start();
        });

        this.DelayedRelease = 0;

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
    }

    CreateSource(){
        this.Sources.push( new Tone.Noise( App.Audio.WaveformTypeIndexNoise[this.Params.waveform] ) );
        return super.CreateSource();
    }

    CreateEnvelope(){
        this.Envelopes.push( new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        ));

        return super.CreateEnvelope();
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Noise",
            "parameters" : [

                {
                    "type" : "buttons",
                    "name" : "Wave",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.Params.waveform,
                        "mode" : "string"
                    },
                    "buttons": [
                        {
                            "name" : "White"
                        },
                        {
                            "name" : "Pink"
                        },
                        {
                            "name" : "Brown"
                        }
                    ]
                }
            ]
        };
    }

    SetParam(param: string,value: any) {
        switch(param) {
            case "waveform":
                this.Sources.forEach((s:any)=> {
                    s.type = App.Audio.WaveformTypeIndexNoise[value];
                });
                break;
        }
        this.Params[param] = value;
    }

    Dispose() {
        super.Dispose();

        this.Sources.forEach((s: any)=> {
            s.dispose();
        });

        this.Envelopes.forEach((e: any)=> {
            e.dispose();
        });

    }
}
