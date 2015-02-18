import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class KeyboardPoly extends Keyboard {

    private _Sources: any[];
    private _Envelopes: any[];
    public Voices: number;

    constructor(grid: Grid, position: Point){

        this.KeysDown = {};
        this.Voices = 4;
        this._Sources = [];
        this._Envelopes = [];

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"poly keyboard");
    }

    Attach(source:ISource): void{
        super.Attach(source);
    }

    Detach(source:ISource): void {
        super.Detach(source);

    }

    Delete(){
        super.Delete();

        this.KeysDown = null;

        for (var i = 0; i < this.Voices; i++) {
            this._Sources[i].dispose();
            this._Envelopes[i].dispose();
        }
        this.Voices = null;
    }

    KeyboardDown(key:string, source:ISource): void {

        var keyPressed = this.GetKeyNoteOctaveString(key);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);

        if (source.Frequency){
            for (var i = 0; i < this.Voices; i++) {

                //Create more sources and envelopes
                this._Sources[i] = new Tone.Oscillator(source.Frequency);
                this._Envelopes[i] = new Tone.Envelope(source.Envelope.attack, source.Envelope.decay, source.Envelope.sustain, source.Envelope.release);

                this._Envelopes[i].connect(this._Sources[i].output.gain);
                this._Sources[i].connect(source.OutputGain);

            }
        }


        //this.Keyboard.triggerAttack(frequency);

        console.log(this._Sources);

    }

    KeyboardUp(key:string, source:ISource): void {

        var keyPressed = this.GetKeyNoteOctaveString(key);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);

        //this.Keyboard.triggerRelease(frequency);

        console.log(frequency);
    }


    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "voices") {
            this.Voices = value;
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;

        if (param == "voices") {
            val = this.Voices;
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Poly Keyboard",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Voices",
                    "setting" :"voices",
                    "props" : {
                        "value" : this.GetValue("voices"),
                        "min" : 2,
                        "max" : 8,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }


}

export = KeyboardPoly;