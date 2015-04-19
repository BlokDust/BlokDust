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
    public FreeVoices: any[];

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.KeysDown = {};
        this.VoicesAmount = 4;
        this.ActiveVoices = []; // list of Objects containing a source and envelope
        this.FreeVoices = [];

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
        this.FreeVoices = [];
    }

    CreateVoices(source, voicesNum){

        //ONLY WORKS FOR NOISE AND TONES FOR NOW
        if (!(source instanceof Power)) {

            // Work out how many voices we actually need (we may already have some)
            var diff = voicesNum - source.Sources.length;

            // If we haven't got enough sources, create however many we need.
            if (diff > 0){

                // Loop through and create the voices
                for (var i = 1; i <= voicesNum; i++) {

                    // Create a source
                    var s: any = source.CreateSource();

                    // Create an envelope
                    var e: Tone.AmplitudeEnvelope = source.CreateEnvelope();

                    // Connect it to the Envelope and start
                    s.connect(e).start();

                    // Connect Envelope to the Effects Chain
                    e.connect(source.EffectsChainInput);



                    // Add the source and envelope to our FreeVoices list
                    this.FreeVoices.push( {
                        source: s,
                        envelope: e
                    } );

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


        // Are there any free voices?
        if (this.FreeVoices.length > 0){

            // Yes, get one of them and remove it from FreeVoices list
            var voice = this.FreeVoices.shift();

            // Add it to the ActiveVoices list
            this.ActiveVoices.push( voice );


            // set it to the right frequency
            if (voice.source.frequency){
                voice.source.frequency.value = frequency;
                //Todo: Call sources "SetFrequency" function
            }


            // get it's corresponding envelope;

            // trigger it's envelope
            voice.envelope.triggerAttack();


        } else {

            // No free voices available - steal the oldest one from active voices
            var voice = this.ActiveVoices.shift();

            // ramp it to the frequency
            voice.source.frequency.rampTo( frequency, 0 );

            // Add it back to the end of ActiveVoices
            this.ActiveVoices.push( voice );

        }


        // Active voices is an array of sources that are in use

        // Key is pressed
        // Add to ActiveVoices object
        // Each item should be the source that is in use - set the current note here too

        // Key is released
        // If the keyup note is equal to the current note saved in the ActiveVoices Object source release it.

        //console.log(source);


    }

    KeyboardUp(keyUp:string, source:ISource): void {
        super.KeyboardUp(keyUp, source);

        var keyPressed = this.GetKeyNoteOctaveString(keyUp);
        var keyUpFrequency = this.GetFrequencyOfNote(keyPressed, source);
        var playbackSpeed; //TODO


        //for (var i = 0; i<this.ActiveVoices.length; i++){
        //
        //    if (this.ActiveVoices[i] == keyUp) {
        //
        //        // Check whether this envelope is playing and has my frequency before releasing it
        //        for (var j=0; j<source.Envelopes.length; j++){
        //
        //            // If frequency or playback speed is the same as this keyUp
        //            if (source.Frequency) {
        //                if (Math.round(source.Sources[j].frequency.value) == Math.round(frequency)) {
        //                    source.Envelopes[j].triggerRelease();
        //                }
        //            } else if (source.PlaybackRate) {
        //                if (Math.round(source.Sources[j].playbackRate) == Math.round(frequency)) {
        //                    source.Envelopes[j].triggerRelease();
        //                }
        //            }
        //        }
        //
        //        //Update the array
        //        this.ActiveVoices.splice(i, 1);
        //    }
        //}


        var voiceToBeRemoved;
        var voiceIndex;

        // Loop through all the active voices
        this.ActiveVoices.forEach((voice: any, i: number) => {

            // if this active voice has the same frequency as the frequency corresponding to the keyUp
            if ( Math.round(voice.source.frequency.value) === Math.round(keyUpFrequency) ) {

                // stop it
                voice.envelope.triggerRelease();

                // Save which voice this is so we can remove it
                voiceToBeRemoved = voice;

                // What is this voices index
                voiceIndex = i;

                // break out of the loop
                return;
            }
        });

        // Check if voiceToBeRemoved has been set
        if ( voiceToBeRemoved ) {

            // Remove voice from Active Voices
            this.ActiveVoices.splice(voiceIndex, 1);

            // Add it to FreeVoices
            this.FreeVoices.push(voiceToBeRemoved);
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