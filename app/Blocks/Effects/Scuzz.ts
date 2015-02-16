import Effect = require("../Effect");
import Grid = require("../../Grid");
import App = require("../../App");

class Scuzz extends Effect {

    LFO: Tone.LFO;

    constructor(grid: Grid, position: Point){

        this.LFO = new Tone.LFO(100, -1000, 1000);
        this.LFO.setType('sawtooth');

        super(grid, position);
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(2, -1),new Point(0, 1),new Point(-1, 0));
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"scuzz");
    }

    Delete(){
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
            "name" : "Scuzz",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Power",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.GetValue("depth"),
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
                        "value" : this.GetValue("rate"),
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