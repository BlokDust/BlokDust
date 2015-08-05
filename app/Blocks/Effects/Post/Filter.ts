import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");

class Filter extends PostEffect {

    public Effect: Tone.Filter;
    public Params: FilterParams;

    Init(sketch?: any): void {

        if (!this.Params) {
            this.Params = {
                frequency: 440,
                gain: 0,
            };
        }

        this.Effect = new Tone.Filter({
            "type" : "peaking",
            "frequency" : this.Params.frequency,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : this.Params.gain
        });


        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -2),new Point(1, 0),new Point(1, 2),new Point(-1, 0));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"filter");
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        this.Effect[param].value = val;

        this.Params[param] = val;
    }

    /*GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="frequency") {
            val = this.Effect.frequency.value;
        } else if (param=="gain") {
            val = this.Effect.gain.value;
        }
        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "Filter",
            "parameters": [

                {
                    "type" : "slider",
                    "name": "Frequency",
                    "setting": "frequency",
                    "props": {
                        "value": this.Params.frequency,
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
                        "value": this.Params.gain,
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