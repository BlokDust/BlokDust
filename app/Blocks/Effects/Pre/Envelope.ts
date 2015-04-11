import PreEffect = require("../PreEffect");
import ISource = require("../../ISource");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");

class Envelope extends PreEffect {



    /*public attack: number;
    public decay: number;
    public sustain: number;
    public release: number;*/

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                attack: 1,
                decay: 5,
                sustain: 0.7,
                release: 4
            };
        }

        /*this.attack = 1;
        this.decay = 5;
        this.sustain = 0.7;
        this.release = 4;*/

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"envelope");
    }


    Attach(source: ISource): void{
        super.Attach(source);

        source.Envelope.attack = this.Params.attack;
        source.Envelope.decay = this.Params.decay;
        source.Envelope.sustain = this.Params.sustain;
        source.Envelope.release = this.Params.release;

        // FOR POLYPHONIC
        for(var i = 0; i<source.PolySources.length; i++){
            source.PolyEnvelopes[i].attack = this.Params.attack;
            source.PolyEnvelopes[i].decay = this.Params.decay;
            source.PolyEnvelopes[i].sustain = this.Params.sustain;
            source.PolyEnvelopes[i].release = this.Params.release;
        }
    }

    Detach(source: ISource): void{
        super.Detach(source);

        source.Envelope.attack = 0.02;
        source.Envelope.decay = 0.5;
        source.Envelope.sustain = 0.5;
        source.Envelope.release = 0.02;

    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        /*if (param=="attack") {
            this.attack = value;

        } else if (param=="decay") {
            this.decay = value;
        } else if (param=="sustain") {
            this.sustain = value;
        } else if (param=="release") {
            this.release = value;
        }*/

        this.Params[param] = val;

        if (this.Sources.Count) {
            for (var i = 0; i < this.Sources.Count; i++) {
                var source = this.Sources.GetValueAt(i);
                source.Envelope.attack = this.Params.attack;
                source.Envelope.decay = this.Params.decay;
                source.Envelope.sustain = this.Params.sustain;
                source.Envelope.release = this.Params.release;

                // FOR POLYPHONIC
                if (source.PolySources.length){
                    for(var i = 0; i<source.PolySources.length; i++){
                        source.PolyEnvelopes[i].attack = this.Params.attack;
                        source.PolyEnvelopes[i].decay = this.Params.decay;
                        source.PolyEnvelopes[i].sustain = this.Params.sustain;
                        source.PolyEnvelopes[i].release = this.Params.release;
                    }
                }
            }
        }
    }

    /*GetParam(param: string) {
        super.GetParam(param);
        var val = this[""+param];
        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "Envelope",
            "parameters": [

                {
                    "type" : "ADSR",
                    "name": "ADSR",
                    "setting": "adsr",
                    "nodes": [
                        {
                            "setting": "attack",
                            "value": this.Params.attack,
                            "min": 0.01,
                            "max": 10
                        },

                        {
                            "setting": "decay",
                            "value": this.Params.decay,
                            "min": 0.01,
                            "max": 15
                        },

                        {
                            "setting": "sustain",
                            "value": this.Params.sustain,
                            "min": 0,
                            "max": 1
                        },

                        {
                            "setting": "release",
                            "value": this.Params.release,
                            "min": 0.01,
                            "max": 15
                        }
                    ]
                }
            ]
        };
    }
}

export = Envelope;