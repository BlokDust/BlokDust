import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");

class Reverb extends PostEffect {

    public Effect: Tone.Freeverb;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                dampening: 0.7,
                roomSize: 0.5,
                mix: 0.5
            };
        }

        this.Effect = new Tone.Freeverb(this.Params.dampening, this.Params.roomSize);
        this.Effect.wet.value = this.Params.mix;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(2, 0),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"reverb");
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="mix") {
            this.Effect.wet.value = val;
        } else if (param=="dampening") {
            this.Effect.dampening.value = val;
        } else if (param=="roomSize") {
            this.Effect.roomSize.value = val;
        }

        this.Params[param] = val;
    }

    /*GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="dryWet") {
            val = this.Effect.wet.value;
        } else if (param=="dampening") {
            val = this.Effect.dampening.value;
        } else if (param=="roomSize") {
            val = this.Effect.roomSize.value;
        }
        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Reverb",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Dampening",
                    "setting" :"dampening",
                    "props" : {
                        "value" : this.Params.dampening,
                        "min" : 0.1,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Room Size",
                    "setting" :"roomSize",
                    "props" : {
                        "value" : this.Params.roomSize,
                        "min" : 0.1,
                        "max" : 0.95,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Mix",
                    "setting" :"mix",
                    "props" : {
                        "value" : this.Params.mix,
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

export = Reverb;