import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");

class LFO extends Effect {

    public LFO: Tone.LFO;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.LFO = new Tone.LFO(2, -20, 20);
        this.LFO.type = 'triangle';

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"lfo");
    }

    Attach(source:ISource): void{
        super.Attach(source);

        if (source.Source.detune) {
            this.LFO.connect(source.Source.detune);
            this.LFO.start();

            // FOR POLYPHONIC
            for(var i = 0; i<source.PolySources.length; i++){
                this.LFO.connect(source.PolySources[i].detune);
            }

        }
    }

    Detach(source:ISource): void {
        super.Detach(source);

        if (source.Source.detune) {
            this.LFO.stop();
            this.LFO.disconnect();


        }
    }

    Dispose() {
        this.LFO.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param=="rate") {
            this.LFO.frequency.value = value;
        } else if (param=="depth") {
            this.LFO.min = -value;
            this.LFO.max = value;
        }
    }

    GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="rate") {
            val = this.LFO.frequency.value;
        } else if (param=="depth") {
            val = this.LFO.max;
        }
        return val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "LFO",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.GetParam("rate"),
                        "min" : 0,
                        "max" : 20,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Depth",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.GetParam("depth"),
                        "min" : 0,
                        "max" : 200,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }
}

export = LFO;