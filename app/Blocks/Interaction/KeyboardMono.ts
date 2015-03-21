import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Soundcloud = require("../Sources/Soundcloud");


class KeyboardMono extends Keyboard {

    public Glide: number;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Glide = 0.05;

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"mono keyboard");
    }

    Attach(source:ISource): void{
        super.Attach(source);
    }

    Detach(source:ISource): void {
        super.Detach(source);
    }

    Dispose(){
        super.Dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "glide") {
            this.Glide = value/100;
        }
    }

    GetParam(param: string) {
        super.GetParam(param);
        var val;

        if (param == "glide") {
            val = this.Glide*100;

        } else if (param == "octave"){
            val = this.CurrentOctave;
        }

        return val;

    }

    OpenParams() {
        super.OpenParams();

        this.OptionsForm =
        {
            "name" : "Mono Keyboard",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Glide",
                    "setting" :"glide",
                    "props" : {
                        "value" : this.GetParam("glide"),
                        "min" : 0.001,
                        "max" : 100,
                        "truemin" : 0,
                        "truemax" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Octave",
                    "setting" :"octave",
                    "props" : {
                        "value" : this.GetParam("octave"),
                        "min" : 0,
                        "max" : 9,
                        "quantised" : true,
                        "centered" : false
                    }
                },

            ]
        };
    }

    KeyboardDown(keyDown:string, source:ISource): void {
        super.KeyboardDown(keyDown, source);

        var keyPressed = this.GetKeyNoteOctaveString(keyDown);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);
        var playbackRate = frequency / 440;

        // If no other keys already pressed trigger attack
        if (Object.keys(this.KeysDown).length === 1) {
            if (source.Source.frequency){
                source.Source.frequency.exponentialRampToValueNow(frequency, 0);
            } else if (source.PlaybackRate){
                source.SetPlaybackRate(playbackRate, 0);

                // If has a loop start position start then plus current time else start immediately
                if(source.LoopStartPosition){
                    source.Source.start(source.LoopStartPosition+ source.Source.now());
                }

            }
            source.TriggerAttack();

        // Else ramp to new frequency over time (glide)
        } else {
            if (source.Source.frequency) {
                source.Source.frequency.exponentialRampToValueNow(frequency, this.Glide);
            } else if (source.PlaybackRate){
                source.SetPlaybackRate(playbackRate, this.Glide);
            }
        }
    }

    KeyboardUp(keyUp:string, source:ISource): void {
        super.KeyboardUp(keyUp, source);

        if (Object.keys(this.KeysDown).length === 0) {
            if (source.PlaybackRate) {
                //source.Source.stop(source.Envelope.release+source.Source.now());
            }
            source.TriggerRelease();
        }
    }
}

export = KeyboardMono;