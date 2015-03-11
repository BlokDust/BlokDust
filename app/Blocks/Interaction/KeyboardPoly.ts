import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");
import Type = require("../BlockType");
import BlocksSketch = require("../../BlocksSketch");
import BlockType = Type.BlockType;

class KeyboardPoly extends Keyboard {


    public VoicesAmount: number;
    public ActiveVoices: any[];

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.KeysDown = {};
        this.VoicesAmount = 4;
        this.ActiveVoices = [];

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"poly keyboard");
    }

    Attach(source:ISource): void {
        super.Attach(source);

        this.CreateVoices(source, this.VoicesAmount);
    }

    Detach(source:ISource): void {
        super.Detach(source);

        this.DeleteVoices(source);
    }

    Delete(){
        super.Delete();
        this.KeysDown = null;
        this.VoicesAmount = null;
        this.ActiveVoices = [];
    }

    CreateVoices(source, voicesNum){

        //If we already have voices delete those first
        if (source.PolySources.length){
            this.DeleteVoices(source);
        }

        //ONLY WORKS FOR NOISE AND TONES FOR NOW
        if (source.BlockType == BlockType.ToneSource || source.BlockType == BlockType.Noise) {

            for (var i = 0; i < voicesNum; i++) {
                //Create the poly sources and envelopes

                if (source.BlockType == BlockType.ToneSource) {
                    source.PolySources[i] = new Tone.Oscillator(source.Frequency, source.Source.getType());
                } else if (source.BlockType == BlockType.Noise) {
                    source.PolySources[i] = new Tone.Noise(source.Source.getType());
                }

                //TODO: Make keyboards trigger samples and instead of pitch change playback speeds
                // Like noteToFrequency, we need a noteToPlaybackSpeed function
                // If base frequency is 440 (A), base playback is 1
                // so 440 => 1, 880 => 2, 220 => 0.5
                // 261 = x
                // 440/1 = 261/x
                // 440x = 261
                // x = 261/440 = 0.59

                // formula is...
                // playbackRate = frequency / baseFrequency;

                source.PolyEnvelopes[i] = new Tone.Envelope(source.Envelope.attack, source.Envelope.decay, source.Envelope.sustain, source.Envelope.release);

                source.PolyEnvelopes[i].connect(source.PolySources[i].output.gain);
                source.PolySources[i].connect(source.EffectsChainInput);

                source.PolySources[i].start();
            }
        }
    }

    DeleteVoices(source){
        for (var i = 0; i < source.PolySources.length; i++) {
            source.PolySources[i].dispose();
            source.PolyEnvelopes[i].dispose();
            source.PolySources = [];
            source.PolyEnvelopes = [];
        }
    }

    KeyboardDown(keyDown:string, source:ISource): void {
        super.KeyboardDown(keyDown, source);

        var keyPressed = this.GetKeyNoteOctaveString(keyDown);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);
        //TODO: add a playback speed option to GetFrequencyOfNote;

        var keysDownNum: number = Object.keys(this.KeysDown).length;
        var voices = this.VoicesAmount;
        var r = keysDownNum % voices;
        if (r == 0) r = voices;

        this.ActiveVoices.push(keyDown);

        // if r is already down use a free one
        for (var i = 0; i<this.ActiveVoices.length; i++) {

                if (source.Frequency) {
                    source.PolySources[r - 1].setFrequency(frequency);
                } else if (source.PlaybackRate){
                    source.PolySources[r-1].setPlaybackRate(frequency);
                }
                source.PolyEnvelopes[r-1].triggerAttack();


                //console.log(this.ActiveVoices);
            //}
        }

        //console.log(source);


    }

    KeyboardUp(keyUp:string, source:ISource): void {
        super.KeyboardUp(keyUp, source);

        var keyPressed = this.GetKeyNoteOctaveString(keyUp);
        var frequency = this.GetFrequencyOfNote(keyPressed, source);
        var playbackSpeed; //TODO


        for (var i = 0; i<this.ActiveVoices.length; i++){

            if (this.ActiveVoices[i] == keyUp) {

                // Check whether this envelope is playing and has my frequency before releasing it
                for (var j=0; j<source.PolyEnvelopes.length; j++){

                    // If frequency is the same as the key up or playback speed is the same as keyup
                    if (Math.round(source.PolySources[j].getFrequency()) == Math.round(frequency)) {
                        source.PolyEnvelopes[j].triggerRelease();
                        console.log(source);
                    }
                }

                //Update the array
                this.ActiveVoices.splice(i, 1);
                //console.log(this.ActiveVoices);
            }
        }
    }


    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "voices") {
            this.VoicesAmount = value;

            // FOR ALL SOURCES
            if (this.Sources.Count) {
                for (var i = 0; i < this.Sources.Count; i++) {
                    var source = this.Sources.GetValueAt(i);
                    this.CreateVoices(source, this.VoicesAmount);
                }
            }
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;

        if (param == "voices") {
            val = this.VoicesAmount;
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
                        "max" : 6,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }


}

export = KeyboardPoly;