import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");

class LFO extends Effect {

    LFO: Tone.LFO;

    constructor(grid: Grid, position: Point){

        this.LFO = new Tone.LFO(2, -20, 20);
        this.LFO.setType('triangle');

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"lfo");
    }

    Attach(source:ISource): void{
        super.Attach(source);

        if (this.Source.Source.detune) {
            this.LFO.connect(this.Source.Source.detune);
            this.LFO.start();
        }

    }

    Detach(source:ISource): void {
        super.Detach(source);

        if (this.Source.Source.detune) {
            if (this.LFO) {
                this.LFO.stop();
                this.LFO.disconnect();
            }
        }
    }

    Delete() {
        this.LFO.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param=="rate") {
            this.LFO.setFrequency(value);
        } else if (param=="depth") {
            this.LFO.setMin(-value);
            this.LFO.setMax(value);
        }
        //console.log(jsonVariable);
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="rate") {
            val = this.LFO.getFrequency();
        } else if (param=="depth") {
            val = this.LFO.getMax();
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "LFO",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.GetValue("rate"),
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
                        "value" : this.GetValue("depth"),
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