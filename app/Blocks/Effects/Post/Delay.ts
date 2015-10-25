import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';

export class Delay extends PostEffect {

    public Effect: Tone.PingPongDelay;
    public Params: DelayParams;
    public Defaults: DelayParams;

    Init(sketch?: any): void {

        this.BlockName = "Delay";

        this.Defaults = {
            delayTime: 0.25,
            feedback: 0.4,
            mix: 0.5
        };
        this.PopulateParams();

        this.Effect = new Tone.PingPongDelay(this.Params.delayTime);
        this.Effect.feedback.value = this.Params.feedback;
        this.Effect.wet.value = this.Params.mix;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2),new Point(0, 1),new Point(-1, 2));
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"delay");
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="mix") {
            this.Effect.wet.value = val;
        } else if (param=="delayTime") {
            this.Effect.delayTime.rampTo(val,0.1);
        } else {
            this.Effect[param].value = val;
        }

        this.Params[param] = val;
    }

/*    GetParam(param: string) {
        super.GetParam(param);
        var val;
        if (param=="delayTime") {
            val = this.Effect.delayTime.value;
        } else if (param=="feedback") {
            val = this.Effect.feedback.value;
        } else if (param=="dryWet") {
            val = this.Effect.wet.value;
        }
        return val;
    }*/

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Delay",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Delay Time",
                    "setting" :"delayTime",
                    "props" : {
                        "value" : this.Params.delayTime,
                        "min" : 0.05,
                        "max" : 0.5,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Feedback",
                    "setting" :"feedback",
                    "props" : {
                        "value" : this.Params.feedback,
                        "min" : 0,
                        "max" : 0.9,
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