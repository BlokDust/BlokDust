import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Soundcloud = require("../Sources/Soundcloud");


class KeyboardMono extends Keyboard {

    //public Glide: number;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                glide: 0.05,
                octave: 3
            };

        }

        super.Init(sketch);


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
        var val = value;

        if (param == "glide") {
            val = value/100;
        }

        if (param == "octave") {
            for (var i = 0, source; i < this.Sources.Count; i++) {
                source = this.Sources.GetValueAt(i);
                var diff = val - this.Params.octave;
                source.OctaveShift(diff);
            }
        }

        this.Params[param] = val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Mono Keyboard",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Glide",
                    "setting" :"glide",
                    "props" : {
                        "value" : this.Params.glide*100,
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
                        "value" : this.Params.octave,
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

        // If no other keys already pressed trigger attack
        if (Object.keys(this.KeysDown).length === 1) {
            source.SetPitch(frequency);
            source.TriggerAttack();

        // Else ramp to new frequency over time (glide)
        } else {
            source.SetPitch(frequency, 0, this.Params.glide);
        }
    }

    KeyboardUp(keyUp:string, source:ISource): void {
        super.KeyboardUp(keyUp, source);

        var keyPressed = this.GetKeyNoteOctaveString(keyUp);
        var keyUpFrequency = this.GetFrequencyOfNote(keyPressed, source);
        var thisPitch = source.GetPitch();

        if (Object.keys(this.KeysDown).length === 0) {
            source.TriggerRelease();
        }
    }
}

export = KeyboardMono;