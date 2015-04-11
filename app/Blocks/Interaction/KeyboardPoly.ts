import Keyboard = require("./Keyboard");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");
import BlocksSketch = require("../../BlocksSketch");
import ToneSource = require("../Sources/ToneSource");
import Noise = require("../Sources/Noise");
import Power = require("../Power/Power");

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

    Dispose(){
        super.Dispose();
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
        if (!(source instanceof Power)) {

            // Work out how many voices we actually need (we may already have some)
            var diff = voicesNum - source.Sources.length;

            // If we haven't got enough sources, create however many we need.
            if (diff > 0){

                for (var i = 1; i <= voicesNum; i++) {

                    if (!(this instanceof Power)) {
                        source.CreateSource();
                    }

                    if (source instanceof ToneSource) {
                        source.Sources.push( new Tone.Oscillator(source.Frequency, source.Sources[0].type) );


                    } else if (source instanceof Noise) {
                        source.Sources.push( new Tone.Noise(source.Sources[0].type) );
                    }


                    source.Envelopes.push( new Tone.AmplitudeEnvelope(
                        source.Envelope.attack,
                        source.Envelope.decay,
                        source.Envelope.sustain,
                        source.Envelope.release
                    ));

                    source.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
                        if (i > 0){
                            e.connect(source.EffectsChainInput);
                        }
                    });

                    source.Sources.forEach((s: any, i: number)=> {
                        if (i > 0){
                            s.connect(source.PolyEnvelopes[i]).start();
                        }
                    });
                }
            }
        }
    }

    DeleteVoices(source){

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
                    source.Sources[r - 1].frequency.value = frequency;
                } else if (source.PlaybackRate){
                    source.Sources[r-1].playbackRate = frequency;
                }
                source.Envelopes[r-1].triggerAttack();


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
                for (var j=0; j<source.Envelopes.length; j++){

                    // If frequency or playback speed is the same as this keyUp
                    if (source.Frequency) {
                        if (Math.round(source.Sources[j].frequency.value) == Math.round(frequency)) {
                            source.Envelopes[j].triggerRelease();
                        }
                    } else if (source.PlaybackRate) {
                        if (Math.round(source.Sources[j].playbackRate) == Math.round(frequency)) {
                            source.Envelopes[j].triggerRelease();
                        }
                    }
                }

                //Update the array
                this.ActiveVoices.splice(i, 1);
            }
        }
    }


    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "voices") {

            // FOR ALL SOURCES
            if (this.Sources.Count) {

                for (var i = 0; i < this.Sources.Count; i++) {
                    var source = this.Sources.GetValueAt(i);

                    for (var j=0; j<source.Envelopes.length; j++){
                        source.Envelopes[j].triggerRelease();
                    }

                    this.CreateVoices(source, this.VoicesAmount);
                }
            }
            this.VoicesAmount = value;
        }
    }

    GetParam(param: string) {
        super.GetParam(param);
        var val;

        if (param == "voices") {
            val = this.VoicesAmount;
        } else if (param == "octave"){
            val = this.CurrentOctave;
        }

        return val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Poly Keyboard",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Voices",
                    "setting" :"voices",
                    "props" : {
                        "value" : this.GetParam("voices"),
                        "min" : 1,
                        "max" : 6,
                        "quantised" : true,
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


}

export = KeyboardPoly;