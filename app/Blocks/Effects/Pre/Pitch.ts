//import PreEffect = require("../PreEffect");
//import ISource = require("../../ISource");
//import Grid = require("../../../Grid");
//import BlocksSketch = require("../../../BlocksSketch");
//import ToneSource = require("../../Sources/ToneSource");
//import Soundcloud = require("../../Sources/Soundcloud");
//import Granular = require("../../Sources/Granular");
//import Recorder = require("../../Sources/Recorder");
//
//class Pitch extends PreEffect {
//
//    public PitchIncrement: number;
//    public Params: PitchIncrementParams;
//
//    Init(sketch?: Fayde.Drawing.SketchContext): void {
//
//        if (!this.Params) {
//            this.Params = {
//                pitchIncrement: 1.5, // Pitch decreases by 4ths
//            };
//        }
//
//        this.PitchIncrement = this.Params.pitchIncrement;
//
//        super.Init(sketch);
//
//        // Define Outline for HitTest
//        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, -1),new Point(0, 1));
//    }
//
//    Draw() {
//        super.Draw();
//        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"pitch");
//    }
//
//    Dispose(){
//        this.PitchIncrement = null;
//    }
//
//    Attach(source: ISource): void {
//        super.Attach(source);
//        this.UpdatePitch(source);
//    }
//
//    Detach(source: ISource): void{
//        super.Detach(source);
//        this.UpdatePitch(source);
//    }
//
//    UpdatePitch(source: ISource): void{
//
//        // TODO: GIVE ALL SOURCES A PITCH PROPERTY
//
//
//        //OSCILLATORS
//        if (source instanceof ToneSource){
//            source.Sources.forEach((s: Tone.Oscillator) => {
//                s.frequency.exponentialRampToValueNow(source.Params.frequency * this._GetConnectedPitchPreEffects(source), 0);
//            });
//
//
//            // TONE.PLAYERS
//        } else if (source instanceof Soundcloud){
//            source.Sources.forEach((s: Tone.Simpler) => {
//                s.player.playbackRate = source.PlaybackRate * this._GetConnectedPitchPreEffects(source);
//            });
//
//
//            // GRANULAR
//        } else if (source instanceof Granular) {
//            //for (var i=0; i<source.GrainsAmount; i++) {
//            //    source.Grains[i].playbackRate = source.PlaybackRate * this._GetConnectedPitchPreEffects(source);
//            //}
//            //TODO: fix for Granular
//
//            // RECORDER
//        } else if (source instanceof Recorder) {
//            source.Sources.forEach((s: Tone.Simpler) => {
//                s.player.playbackRate = source.PlaybackRate * this._GetConnectedPitchPreEffects(source);
//            });
//        }
//
//    }
//
//    SetParam(param: string,value: number) {
//        super.SetParam(param,value);
//        var val = value;
//
//        this.PitchIncrement = val;
//        this.Params[param] = val;
//
//        if (this.Sources.Count) {
//            for (var i = 0; i < this.Sources.Count; i++) {
//                var source = this.Sources.GetValueAt(i);
//
//                this.UpdatePitch(source);
//            }
//        }
//
//    }
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
//                    "name" : "Pitch",
//                    "setting" :"pitchIncrement",
//                    "props" : {
//                        "value" : this.Params.pitchIncrement,
//                        "min" : 0.5,
//                        "max" : 2,
//                        "quantised" : false,
//                        "centered" : true,
//                        "logarithmic": true
//                    }
//                }
//            ]
//        };
//    }
//
//    private _GetConnectedPitchPreEffects(source) {
//
//        var totalPitchIncrement: number = 1;
//
//        for (var i = 0; i < source.Effects.Count; i++) {
//            var effect = source.Effects.GetValueAt(i);
//
//            if ((<Pitch>effect).PitchIncrement) {
//                var thisPitchIncrement = (<Pitch>effect).PitchIncrement;
//                totalPitchIncrement *= thisPitchIncrement;
//            }
//        }
//
//        return totalPitchIncrement;
//    }
//}
//
//export = Pitch;

import PostEffect = require("../PostEffect");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");
import PitchShifter = require("../Post/PitchShifter");

class Pitch extends PostEffect {

    public Effect: PitchShifter;
    public Params: PitchShifterParams;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                pitchOffset: 0,
            };
        }

        this.Effect = new PitchShifter();

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, -1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"pitch");
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
            "name" : "Phaser",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Pitch-shift",
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

export = Pitch;