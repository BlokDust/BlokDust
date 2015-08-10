import Grid = require("../../Grid");
import MainScene = require("../../MainScene");
import Source = require("../Source");

class Noise extends Source {

    public DelayedRelease: number;
    public Noise: any;
    public Waveform: string;
    public NoiseParams: NoiseParams;

    Init(sketch?: any): void {

        this.Waveform = 'brown';

        this.WaveIndex = ["white","pink","brown"];

        if (!this.Params) {
            this.Params = {
                playbackRate: 1,
                waveform: 2,
            };
        }

        super.Init(sketch);

        this.CreateSource();
        this.CreateEnvelope();

        this.Envelopes.forEach((e: any)=> {
            e.connect(this.EffectsChainInput);
        });

        this.Sources.forEach((s: any, i:number)=> {
            s.connect(this.Envelopes[i]).start();
        });

        this.DelayedRelease = 0;

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(1, 0),new Point(-1, 2));
    }

    CreateSource(){
        this.Sources.push( new Tone.Noise( this.WaveIndex[this.Params.waveform] ) );
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
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"noise");
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Noise",
            "parameters" : [

                /*{
                    "type" : "slider",
                    "name" : "Waveform",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.Params.waveform,
                        "min" : 0,
                        "max" : 2,
                        "quantised" : true,
                        "centered" : false
                    }
                },*/
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

        var val = value;

        this.Params[""+param] = val;
        super.SetParam(param,value);
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

export = Noise;