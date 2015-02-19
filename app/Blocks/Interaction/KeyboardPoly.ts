import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class KeyboardPoly extends Keyboard {


    public Voices: number;
    public FreeVoices: any[];
    public ActiveVoices: any;

    constructor(grid: Grid, position: Point){

        this.KeysDown = {};
        this.Voices = 4;
        this.FreeVoices = [];
        //this.FreeVoice/
        this.ActiveVoices = {};

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


        for (var i = 0; i < this.Voices; i++) {

            //Create the sources and envelopes
            source.PolySources[i] = new Tone.Oscillator(source.Frequency, source.Source.getType());
            source.PolyEnvelopes[i] = new Tone.Envelope(source.Envelope.attack, source.Envelope.decay, source.Envelope.sustain, source.Envelope.release);

            source.PolyEnvelopes[i].connect(source.PolySources[i].output.gain);
            source.PolySources[i].connect(source.OutputGain);

            source.PolySources[i].start();
        }

    }

    Detach(source:ISource): void {
        super.Detach(source);

        if (source.Frequency){
            for (var i = 0; i < source.PolySources.length; i++) {

                //Delete the sources and envelopes
                source.PolySources[i].dispose();
                source.PolyEnvelopes[i].dispose();
                source.PolySources = [];
                source.PolyEnvelopes = [];

            }
        }
    }

    Delete(){
        super.Delete();

        this.KeysDown = null;
        this.Voices = null;
    }

    KeyboardDown(key:string, source:ISource): void {
        super.KeyboardDown(key, source);

        var keyPressed = this.GetKeyNoteOctaveString(key);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);


        var _voice = Object.keys(this.KeysDown).length - 1;

        if (_voice < this.Voices){
            source.PolySources[_voice].setFrequency(frequency);
            source.PolyEnvelopes[_voice].triggerAttack();
        } else {
            source.PolyEnvelopes[0].triggerRelease();
        }

    }

    KeyboardUp(key:string, source:ISource): void {
        super.KeyboardUp(key, source);

        var keyPressed = this.GetKeyNoteOctaveString(key);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);

        var _voice = Object.keys(this.KeysDown).length - 1;

        source.PolyEnvelopes[_voice+1].triggerRelease();

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