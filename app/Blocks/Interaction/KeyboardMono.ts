import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");

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

        (<Grid>this.Sketch).BlockSprites.Draw(this.Position,true,"mono keyboard");
    }

    Attach(source:ISource): void{
        super.Attach(source);
    }

    Detach(source:ISource): void {
        super.Detach(source);
    }

    Delete(){
        super.Delete();
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "glide") {
            this.Glide = value/100;
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;

        if (param == "glide") {
            val = this.Glide*100;
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Mono Keyboard",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Glide",
                    "setting" :"glide",
                    "props" : {
                        "value" : this.GetValue("glide"),
                        "min" : 0.001,
                        "max" : 100,
                        "truemin" : 0,
                        "truemax" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                }
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
                //source.Source.start();
                source.TriggerAttack();
            }
            source.Envelope.triggerAttack();

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
            source.Envelope.triggerRelease();

            if (source.PlaybackRate) {
                //source.Source.stop(source.Source.toSeconds(source.Envelope.release));
                source.TriggerRelease();
            }
        }
    }
}

export = KeyboardMono;