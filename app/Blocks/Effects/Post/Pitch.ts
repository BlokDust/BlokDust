import {IApp} from '../../../IApp';
import {MainScene} from '../../../MainScene';
import {PitchShifter} from '../Post/PitchShifter';
import {PostEffect} from '../PostEffect';

declare var App: IApp;

export class Pitch extends PostEffect {

    public Effect: PitchShifter;
    public Params: PitchShifterParams;
    public Defaults: PitchShifterParams;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.BlockName = "Pitch Shift";

        this.Defaults = {
            pitchOffset: 0
        };
        this.PopulateParams();

        this.Effect = new PitchShifter(App.Audio.ctx);
        this.Effect.PitchOffset = this.Params.pitchOffset;

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, -1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"pitch");
    }

    Dispose(){
        //this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="pitchOffset") {
            this.Effect.PitchOffset = value;
        }
        this.Params[param] = val;
    }


    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Pitch Shift",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Pitchshift",
                    "setting" :"pitchOffset",
                    "props" : {
                        "value" : this.Params.pitchOffset,
                        "min" : -1,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : true
                    }
                }
            ]
        };
    }
}