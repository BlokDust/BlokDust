import PreEffect = require("../PreEffect");
import Grid = require("../../../Grid");
import ISource = require("../../ISource");
import MainScene = require("../../../MainScene");

class Scuzz extends PreEffect {

    public LFO: Tone.LFO;
    public Params: ScuzzParams;
    public WaveIndex: string[];

    Init(sketch?: any): void {

        if (!this.Params) {
            this.Params = {
                depth: 1000,
                rate: 100,
                waveform: 2
            };
        }
        this.WaveIndex = ["sine","square","triangle","sawtooth"];

        this.LFO = new Tone.LFO();
        this.LFO.frequency.value = this.Params.rate;
        this.LFO.min = -this.Params.depth;
        this.LFO.max = this.Params.depth;
        this.LFO.type = this.WaveIndex[this.Params.waveform];
        this.LFO.start();

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(2, -1),new Point(0, 1),new Point(-1, 0));
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"scuzz");
    }

    Attach(source:ISource): void{
        super.Attach(source);

        source.Sources.forEach((osc: any) => {
            if (osc.detune){
                this.LFO.connect(osc.detune);
            }
        });
    }

    Detach(source:ISource): void {
        super.Detach(source);

        source.Sources.forEach((osc: any) => {
            if (osc.detune){
                this.LFO.disconnect();
            }
        });

        this.UpdatePreEffectConnections();
    }

    UpdatePreEffectConnections() {
        super.UpdatePreEffectConnections();
        const sources: ISource[] = this.Connections.ToArray();
        sources.forEach((source: ISource) => {

            source.Sources.forEach((osc: Tone.Oscillator) => {
                if (osc.detune){
                    this.LFO.connect(osc.detune);
                }
            })

        });
    }

    Dispose(){
        this.LFO.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="rate") {
            this.LFO.frequency.value = val;
        } else if (param=="depth") {
            this.LFO.min = -val;
            this.LFO.max = val;
        }

        this.Params[param] = val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

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

export = Scuzz;