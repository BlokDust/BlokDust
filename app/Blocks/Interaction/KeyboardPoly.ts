import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class KeyboardPoly extends Keyboard {


    public Voices: number;
    public ActiveVoices: any;

    constructor(grid: Grid, position: Point){

        this.KeysDown = {};
        this.Voices = 4;
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
            //Create the poly sources and envelopes

            if (source.BlockType == BlockType.ToneSource){
                source.PolySources[i] = new Tone.Oscillator(source.Frequency, source.Source.getType());
            } else if (source.BlockType == BlockType.Noise){
                source.PolySources[i] = new Tone.Noise(source.Source.getType());
            }

            source.PolyEnvelopes[i] = new Tone.Envelope(source.Envelope.attack, source.Envelope.decay, source.Envelope.sustain, source.Envelope.release);

            source.PolyEnvelopes[i].connect(source.PolySources[i].output.gain);
            source.PolySources[i].connect(source.EffectsChainInput);

            source.PolySources[i].start();
        }

    }

    Detach(source:ISource): void {
        super.Detach(source);

        //if (source.Frequency){
            for (var i = 0; i < source.PolySources.length; i++) {

                //Delete the sources and envelopes
                source.PolySources[i].dispose();
                source.PolyEnvelopes[i].dispose();
                source.PolySources = [];
                source.PolyEnvelopes = [];

            }
        //}
    }

    Delete(){
        super.Delete();

        this.KeysDown = null;
        this.Voices = null;
        this.ActiveVoices = {};
    }

    KeyboardDown(keyDown:string, source:ISource): void {
        super.KeyboardDown(keyDown, source);

        var keyPressed = this.GetKeyNoteOctaveString(keyDown);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);

        var keysDownNum: number = Object.keys(this.KeysDown).length;
        var voices = this.Voices;
        var r = keysDownNum % voices;
        if (r == 0) r = voices;

        // If more than allocated voices pressed stop oldest one.
        if (keysDownNum / voices > 1){
            //We've used up all the available voices so release one
            source.PolyEnvelopes[r-1].triggerRelease();
        }

            //TODO: fix trigger release bug
        if (source.Frequency) {
            source.PolySources[r - 1].setFrequency(frequency);
        }
        source.PolyEnvelopes[r-1].triggerAttack();

        this.ActiveVoices[keyDown] = r;

    }

    KeyboardUp(keyup:string, source:ISource): void {
        super.KeyboardUp(keyup, source);

            // if this key up is in Keys.Down release it
            if (keyup in this.ActiveVoices) {

                var r = this.ActiveVoices[keyup];
                source.PolyEnvelopes[r-1].triggerRelease();
            }
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