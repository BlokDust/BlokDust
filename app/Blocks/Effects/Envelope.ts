import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");

class Envelope extends Effect {

    public attack: number;
    public decay: number;
    public sustain: number;
    public release: number;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.attack = 1;
        this.decay = 5;
        this.sustain = 0.7;
        this.release = 4;

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

        source.Envelope.attack = this.attack;
        source.Envelope.decay = this.decay;
        source.Envelope.sustain = this.sustain;
        source.Envelope.release = this.release;

        // FOR POLYPHONIC
        for(var i = 0; i<source.PolySources.length; i++){
            source.PolyEnvelopes[i].attack = this.attack;
            source.PolyEnvelopes[i].decay = this.decay;
            source.PolyEnvelopes[i].sustain = this.sustain;
            source.PolyEnvelopes[i].release = this.release;
        }
    }

    Detach(source: ISource): void{
        super.Detach(source);

        source.Envelope.attack = 0.02;
        source.Envelope.decay = 0.5;
        source.Envelope.sustain = 0.5;
        source.Envelope.release = 0.02;

    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);

        if (param=="attack") {
            this.attack = value;

        } else if (param=="decay") {
            this.decay = value;
        } else if (param=="sustain") {
            this.sustain = value;
        } else if (param=="release") {
            this.release = value;
        }

        if (this.Sources.Count) {
            for (var i = 0; i < this.Sources.Count; i++) {
                var source = this.Sources.GetValueAt(i);
                source.Envelope.attack = this.attack;
                source.Envelope.decay = this.decay;
                source.Envelope.sustain = this.sustain;
                source.Envelope.release = this.release;

                // FOR POLYPHONIC
                if (source.PolySources.length){
                    for(var i = 0; i<source.PolySources.length; i++){
                        source.PolyEnvelopes[i].attack = this.attack;
                        source.PolyEnvelopes[i].decay = this.decay;
                        source.PolyEnvelopes[i].sustain = this.sustain;
                        source.PolyEnvelopes[i].release = this.release;
                    }
                }
            }
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val = this[""+param];
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
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
                            "value": this.GetValue("attack"),
                            "min": 0.01,
                            "max": 10
                        },

                        {
                            "setting": "decay",
                            "value": this.GetValue("decay"),
                            "min": 0.01,
                            "max": 15
                        },

                        {
                            "setting": "sustain",
                            "value": this.GetValue("sustain"),
                            "min": 0,
                            "max": 1
                        },

                        {
                            "setting": "release",
                            "value": this.GetValue("release"),
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