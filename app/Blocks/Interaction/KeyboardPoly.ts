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

    Attach(source: ISource): void {
        super.Attach(source);

        this.CreateVoices(source, this.VoicesAmount);
    }

    Detach(source: ISource): void {
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

    CreateVoices(source: ISource, voicesNum: number){

        //ONLY WORKS FOR NOISE AND TONES FOR NOW
        if (!(source instanceof Power)) {

            // Work out how many voices we actually need (we may already have some)
            var diff = voicesNum - source.Sources.length;

            // If we haven't got enough sources, create however many we need.
            if (diff > 0){

                // Loop through and create the voices
                for (var i = 1; i <= voicesNum; i++) {


                    // Create a source
                    var s: Tone.Source = source.CreateSource();

                    var e: Tone.AmplitudeEnvelope;

                    // If the source has a CreateEnvelope function
                    if (source.CreateEnvelope()) {

                        // Create an envelope and save it to `var e`
                        e = source.CreateEnvelope();

                        // Connect the source to the Envelope and start
                        s.connect(e);
                        s.start();

                        // Connect Envelope to the Effects Chain
                        e.connect(source.EffectsChainInput);

                    } else {
                        // No CreateEnvelope()
                        // Check if it's a Sampler Source (they have their own envelopes built in)
                        if (source.Sources[0] instanceof Tone.Sampler) {
                            e = source.Sources[i].envelope;
                            s.connect(source.EffectsChainInput)
                        }

                    }

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
                //Todo: Call sources "SetNote" function
            }



            // get it's corresponding envelope;

            // trigger it's envelope
            voice.envelope.triggerAttack();


        } else {

            // No free voices available - steal the oldest one from active voices
            var voice = this.ActiveVoices.shift();

            // ramp it to the frequency
            if (voice.source.frequency) {
                voice.source.frequency.rampTo(frequency, 0);
            }

            // Add it back to the end of ActiveVoices
            this.ActiveVoices.push( voice );

        }


    }

    KeyboardUp(keyUp:string, source:ISource): void {
        super.KeyboardUp(keyUp, source);

        var keyPressed = this.GetKeyNoteOctaveString(keyUp);
        var keyUpFrequency = this.GetFrequencyOfNote(keyPressed, source);
        var playbackSpeed; //TODO

        var voiceToBeRemoved;
        var voiceIndex;

        // Loop through all the active voices
        this.ActiveVoices.forEach((voice: any, i: number) => {

            if (voice.source.frequency) {

                // if this active voice has the same frequency as the frequency corresponding to the keyUp
                if (Math.round(voice.source.frequency.value) === Math.round(keyUpFrequency)) {

                    // stop it
                    voice.envelope.triggerRelease();

                    // Save which voice this is so we can remove it
                    voiceToBeRemoved = voice;

                    // What is this voices index
                    voiceIndex = i;

                    // break out of the loop
                    return;
                }

            } else if (voice.source.pitch) {
                // For samplers

                // if this active voice has the same frequency as the frequency corresponding to the keyUp
                if (Math.round(voice.source.frequency.value) === Math.round(keyUpFrequency)) {

                    // stop it
                    voice.envelope.triggerRelease();

                    // Save which voice this is so we can remove it
                    voiceToBeRemoved = voice;

                    // What is this voices index
                    voiceIndex = i;

                    // break out of the loop
                    return;
                }
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