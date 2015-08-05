import PreEffect = require("../PreEffect");
import Grid = require("../../../Grid");
import ISource = require("../../ISource");
import BlocksSketch = require("../../../BlocksSketch");

class Scuzz extends PreEffect {

    public LFO: Tone.LFO;
    public Params: ScuzzParams;

    Init(sketch?: any): void {

        if (!this.Params) {
            this.Params = {
                depth: 1000,
                rate: 100,
            };
        }

        this.LFO = new Tone.LFO(100, -1000, 1000);
        this.LFO.type = 'sawtooth';

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(2, -1),new Point(0, 1),new Point(-1, 0));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"scuzz");
    }

    Attach(source:ISource): void{
        super.Attach(source);

        source.Sources.forEach((s: any) => {
            if (s.detune){
                this.LFO.connect(s.detune);
                this.LFO.start();
            }
        });
    }

    Detach(source:ISource): void {
        super.Detach(source);

        source.Sources.forEach((s: any) => {
            if (s.detune){
                this.LFO.stop();
                this.LFO.disconnect();
            }
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

    /*GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="rate") {
            val = this.LFO.frequency.value;
        } else if (param=="depth") {
            val = this.LFO.max;
        }
        return val;
    }*/

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