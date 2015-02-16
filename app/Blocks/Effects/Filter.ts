import Effect = require("../Effect");
import Grid = require("../../Grid");
import App = require("../../App");

class Filter extends Effect {

    public Effect: Tone.Filter;

    constructor(grid: Grid, position: Point){

        this.Effect = new Tone.Filter({
            "type" : "peaking",
            "frequency" : 440,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : 0
        });

        super(grid, position);
        
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -2),new Point(1, 0),new Point(1, 2),new Point(-1, 0));
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"filter");
    }

    Delete(){
        this.Effect.dispose();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;
        this.Effect.set(
            jsonVariable
        );
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;
        if (param=="frequency") {
            val = this.Effect.getFrequency();
        } else if (param=="gain") {
            val = this.Effect.getGain();
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name": "Filter",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Frequency",
                    "setting": "frequency",
                    "props": {
                        "value": this.GetValue("frequency"),
                        "min": 20,
                        "max": 20000,
                        "quantised": true,
                        "centered": false,
                        "logarithmic": true
                    }
                },

                {
                    "type" : "slider",
                    "name": "Gain",
                    "setting": "gain",
                    "props": {
                        "value": this.GetValue("gain"),
                        "min": -50,
                        "max": 50,
                        "quantised": false,
                        "centered": true
                    }
                }
            ]
        };
    }
}

export = Filter;