import PreEffect = require("../Effects/PreEffect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import PitchComponent = require("./../Effects/Pre/Pitch");
import Microphone = require("../Sources/Microphone");
import Power = require("../Power/Power");
import Voice = require("./VoiceObject");

/**
 * Base class for mono, poly and midi keyboards
 */
class Keyboard extends PreEffect {

    public BaseFrequency: number;
    public KeysDown: any = {};

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);
    }

    Draw() {
        super.Draw();
    }

    Attach(source:ISource): void{
        super.Attach(source);
        this.SetBaseFrequency(source);
        this.KeysDown = {};

        // Check to see if we have enough sources on this block
        if ((source.Sources.length === 1) && (this.Params.isPolyphonic)) {
            // Create extra polyphonic voices
            this.CreateVoices(source);
        }
    }

    Detach(source:ISource): void {

        // FOR ALL SOURCES
        for (var i = 0; i < this.Sources.Count; i++) {
            var source = this.Sources.GetValueAt(i);

            if (this.IsPressed){
                source.Envelopes.forEach((e: Tone.AmplitudeEnvelope) => {
                    //TODO: use the new TriggerRelease method
                    e.triggerRelease();
                });

            }

            //TODO: Change this to only set the main frequency back.
            source.Sources.forEach((s: any) => {
                if (s.frequency){
                    s.frequency.value = source.Params.frequency;
                }
            });

        }

        super.Detach(source);
    }

    Dispose(){
        this.KeysDown = null;
        this.BaseFrequency = null;
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param == "glide") {
            val = value/100;
        }
        else if (param == "octave") {
            for (var i = 0, source; i < this.Sources.Count; i++) {
                source = this.Sources.GetValueAt(i);
                var diff = val - this.Params.octave;
                source.OctaveShift(diff);
            }
        }
        else if (param === 'polyphonic') {
            this.Params.isPolyphonic = val;
            // ALL SOURCES
            for (var i = 0; i < this.Sources.Count; i++) {
                var source: any = this.Sources.GetValueAt(i);

                source.TriggerRelease('all');

                // Create extra polyphonic voices
                this.CreateVoices(source);
            }

        }

        this.Params[param] = val;
    }

    CreateVoices(source: ISource){
        // Don't create if it's a Power or a Microphone
        if ((source instanceof Power) || (source instanceof Microphone)) return;

        // Work out how many voices we actually need (we may already have some)
        var diff = App.Config.PolyphonicVoices - source.Sources.length;

        // If we haven't got enough sources, create however many we need.
        if (diff > 0){

            // Loop through and create the voices
            for (var i = 1; i <= App.Config.PolyphonicVoices; i++) {

                // Create a source
                var s: Tone.Source = source.CreateSource();

                var e: Tone.AmplitudeEnvelope;

                // Create an envelope and save it to `var e`
                e = source.CreateEnvelope();

                if (e) {
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
                source.FreeVoices.push( new Voice(i) );
            }
        }
    }


    public SetBaseFrequency(source:ISource){

        if (source.Params && source.Params.frequency){
            this.BaseFrequency = source.Params.frequency;
        } else {
            this.BaseFrequency = App.BASE_NOTE;
        }
    }

    public GetStartOctave(source): number {
        var octave,
            note = source.Source.frequencyToNote(this.BaseFrequency);

        if (note.length === 3) {
            octave = parseInt(note.charAt(2));
        } else {
            octave = parseInt(note.charAt(1));
        }

        return octave;
    }

    /**
     * Gets the note string from the computer keyboard event keynote & octave string
     * @param keyCode
     * @returns {string}
     * @constructor
     */
    public GetKeyNoteOctaveString(keyCode): string {
        return (keyCode
            .replace('note_', '')
            .replace('_a', this.Params.octave)
            .replace('_b', this.Params.octave + 1)
            .replace('_c', this.Params.octave + 2)
            .replace('_d', this.Params.octave + 3)
            .toString());
    }

    /**
     * Gets the frequency from a note string and multiplies by any pitch increments
     * @param note
     * @param source
     * @returns {number}
     * @constructor
     */
    public GetFrequencyOfNote(note, source): number {
        return source.Sources[0].noteToFrequency(note) * this.GetConnectedPitchPreEffects(source);
    }

    /**
     * Checks a Sources connected pitch effects and gets the total pitch increment
     * @param source
     * @returns {number}
     * @constructor
     */
    public GetConnectedPitchPreEffects(source) {

        var totalPitchIncrement = 1;

        for (var i = 0; i < source.Effects.Count; i++) {
            var effect = source.Effects.GetValueAt(i);

            if (effect instanceof PitchComponent) {
                var thisPitchIncrement = (<PitchComponent>effect).PitchIncrement;
                totalPitchIncrement *= thisPitchIncrement;
            }
        }

        return totalPitchIncrement;
    }

    /**
     * Turns midi velocity information into a number 0 - 1 for gain
     * @param velocity
     * @returns {number}
     * @constructor
     */
    MidiVelocityToGain(velocity){
        return velocity/127;
    }

}

export = Keyboard;