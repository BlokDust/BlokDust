//import {IApp} from '../../../IApp';
//import {MainScene} from '../../../MainScene';
//import {PitchShifter} from '../Post/PitchShifter';
//import {PostEffect} from '../PostEffect';
//
//declare var App: IApp;
//
//// USING TONE.PITCH instead - still in testing
//// Notes are flat when pitch set to below 0
//// there is a clicking sound when changing between positive and negative values
//export class Pitch extends PostEffect {
//
//    public Effect: Tone.PitchShift;
//    public Params: any;
//
//    Init(sketch?: Fayde.Drawing.SketchContext): void {
//
//        if (!this.Params) {
//            this.Params = {
//                pitchOffset: 0,
//                windowSize: 0.03
//            };
//        }
//
//        //this.Effect = new PitchShifter(App.Audio.ctx);
//        this.Effect = new Tone.PitchShift(this.Params.pitchOffset);
//        //this.Effect.PitchOffset = this.Params.pitchOffset;
//
//        super.Init(sketch);
//
//        // Define Outline for HitTest
//        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, -1),new Point(0, 1));
//    }
//
//    Draw() {
//        super.Draw();
//        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"pitch");
//    }
//
//    Dispose(){
//        //this.Effect.dispose();
//    }
//
//    SetParam(param: string,value: number) {
//        super.SetParam(param,value);
//
//        if (param=="pitchOffset") {
//            this.Effect.pitch = value;
//        } else if (param=="windowSize") {
//            this.Effect.windowSize = value;
//        }
//        this.Params[param] = value;
//    }
//
//
//    UpdateOptionsForm() {
//        super.UpdateOptionsForm();
//
//        this.OptionsForm =
//        {
//            "name" : "Pitch",
//            "parameters" : [
//
//                {
//                    "type" : "slider",
//                    "name" : "Pitchshift",
//                    "setting" :"pitchOffset",
//                    "props" : {
//                        "value" : this.Params.pitchOffset,
//                        "min" : -12,
//                        "max" : 12,
//                        "quantised" : false,
//                        "centered" : true
//                    }
//                },
//                {
//                    "type" : "slider",
//                    "name" : "Pitchshift",
//                    "setting" :"windowSize",
//                    "props" : {
//                        "value" : this.Params.windowSize,
//                        "min" : 0.03,
//                        "max" : 0.1,
//                        "quantised" : false
//                    }
//                }
//            ]
//        };
//    }
//}