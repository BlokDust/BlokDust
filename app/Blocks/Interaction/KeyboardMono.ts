import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");

class KeyboardMono extends Keyboard {

    public Glide: number;

    constructor(grid: Grid, position: Point){
        this.Glide = 0.05;

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"mono keyboard");
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

    KeyboardDown(key:string, source:ISource): void {

        //if (this.KeyMap[key.keyCode] == 'OctaveUp' && this.CurrentOctave < 9) {
        //    this.CurrentOctave++;
        //    return;
        //}
        //
        //if (this.KeyMap[key.keyCode] === 'OctaveDown' && this.CurrentOctave != 0) {
        //    this.CurrentOctave--;
        //    return;
        //}

        var keyPressed = this.GetKeyNoteOctaveString(key);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);


        // If no other keys already pressed trigger attack
        if (Object.keys(this.KeysDown).length === 1) {
            if (source.Source.frequency){
                source.Source.frequency.exponentialRampToValueNow(frequency, 0);
            }
            source.Envelope.triggerAttack();

            // Else ramp to new frequency over time (glide)
        } else {
            if (source.Source.frequency) {
                source.Source.frequency.exponentialRampToValueNow(frequency, this.Glide);
            }
        }
    }

    KeyboardUp(key:string, source:ISource): void {

        var keyPressed = this.GetKeyNoteOctaveString(key);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);

        if (Object.keys(this.KeysDown).length === 0) {
            source.Envelope.triggerRelease();
        }
    }
}

export = KeyboardMono;