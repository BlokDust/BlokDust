import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");

class AutoWah extends PostEffect {

    public Effect: Tone.AutoWah;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Effect = new Tone.AutoWah({
            "baseFrequency": 440,
            "octaves": 3,
            "sensitivity": -40,
            "rolloff" : -48,

            "follower" : {
                "attack": 0.5,
                "release": 0.01
            }
        });
        this.Effect.wet.value = 0.8;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(0, -1),new Point(1, -1),new Point(1, 1),new Point(-2, 1));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"autowah");
    }

    Dispose() {
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param=="dryWet") {
            this.Effect.wet.value = value;
        } else if (param=="octaves") {
            this.Effect.octaves = value;
        } else if (param=="baseFrequency") {
            this.Effect.baseFrequency = value;
        }
    }

    GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="octaves") {
            val = this.Effect.octaves;
        } else if (param=="baseFrequency") {
            val = this.Effect.baseFrequency;
        } else if (param=="dryWet") {
            val = this.Effect.wet.value;
        }

        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.OptionsForm =
        {
            "name" : "Auto Wah",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Range",
                    "setting" :"octaves",
                    "props" : {
                        "value" : this.GetParam("octaves"),
                        "min" : 1,
                        "max" : 4,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Frequency",
                    "setting" :"baseFrequency",
                    "props" : {
                        "value" : this.GetParam("baseFrequency"),
                        "min" : 50,
                        "max" : 1200,
                        "quantised" : true,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Mix",
                    "setting" :"dryWet",
                    "props" : {
                        "value" : this.GetParam("dryWet"),
                        "min" : 0,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
    }
}

export = AutoWah;