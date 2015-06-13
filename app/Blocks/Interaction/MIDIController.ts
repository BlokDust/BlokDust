import Keyboard = require("./Keyboard");
import Voice = require("./VoiceObject");
import ISource = require("../ISource");
import BlocksSketch = require("../../BlocksSketch");
import Microphone = require("../Sources/Microphone");
import Power = require("../Power/Power");

class MIDIController extends Keyboard {

    private Midi: any;
    private Data: any;
    private _Cmd;
    private _Channel;
    private _Type;
    private _Note;
    private _Velocity;
    public VoicesAmount: number;
    public KeysDown: any;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                glide: 0.05,
                octave: 3
            };
        }

        super.Init(sketch);

        // request MIDI access
        if(navigator.requestMIDIAccess){
            console.log(this);
            navigator.requestMIDIAccess({sysex: false}).then(this.OnMIDISuccess.bind(this), this.OnMIDIFailure.bind(this));
        } else {
            console.log('No MIDI support in your browser. Check here: http://caniuse.com/midi'); //Todo: display this in a modal box
        }

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }



    /**
     * MIDI Success event
     * @param midiAccess
     * @constructor
     */
    private OnMIDISuccess(midiAccess){
        // when we get a successful response, run this code
        console.log('MIDI success', midiAccess);
        console.log(this);

        this.Midi = midiAccess; // this is our raw MIDI data, inputs, outputs, and sysex status

        var inputs = this.Midi.inputs.values();

        // loop over all available inputs and listen for any MIDI input
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            // each time there is a midi message call the OnMIDIMessage function
            input.value.onmidimessage = this.OnMIDIMessage.bind(this);

            // Show this input
            this.DisplayInput(input);
        }

        // listen for connect/disconnect message
        this.Midi.onstatechange = this.OnStateChange;
    }

    /**
     * Browser doesn't support WebMIDI API event
     * @param error - Event
     * @constructor
     */
    private OnMIDIFailure(error) {
        // when we get a failed response, run this code
        console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + error);
    }

    /**
     * MIDI Message received callback
     * @param message
     */
    private OnMIDIMessage(message) {
        this.Data = message.data; // this gives us our [command/channel, note, velocity] data.
        this._Cmd = this.Data[0] >> 4;
        this._Channel = this.Data[0] & 0xf;
        this._Type = this.Data[0] & 0xf0; // channel agnostic message type. Thanks, Phil Burk.
        this._Note = App.AudioMixer.Master.midiToNote(this.Data[1]);
        this._Velocity = this.MidiVelocityToGain(this.Data[2]);
        // with pressure and tilt off
        // note off: 128, cmd: 8
        // note on: 144, cmd: 9
        // pressure / tilt on
        // pressure: 176, cmd 11:
        // bend: 224, cmd: 14

        console.log(
            'cmd:',this._Cmd,
            'channel:', this._Channel,
            'type:', this._Type,
            'note:', this._Note,
            'velocity', this._Velocity
    );

        if (this._Type === 144) {
            // Key down type

            this.KeysDown[this._Note] = true;

            // ALL SOURCES TRIGGER KEYBOARD DOWN
            if (this.Sources.Count) {
                for (var i = 0; i < this.Sources.Count; i++) {
                    var source = this.Sources.GetValueAt(i);
                    this.KeyboardDown(this._Note, source);
                }
            }


        } else if (this._Type === 128) {
            // Key up type

            //Check if this key released is in out key_map
            if (typeof this._Note !== 'undefined' && this._Note !== '') {
                // remove this key from the keysDown object
                delete this.KeysDown[this._Note];
            }

            // ALL SOURCES TRIGGER KEYBOARD UP
            if (this.Sources.Count) {
                for (var i = 0; i < this.Sources.Count; i++) {
                    var source = this.Sources.GetValueAt(i);
                    this.KeyboardUp(this._Note, source);
                }
            }
        }
    }

    /**
     * Displays the connected MIDI input device
     * @param inputs : MIDI input value
     * @return input Object
     */
    private DisplayInput(input){
        var i = input.value;
        console.log("Input port : [ type:'" + i.type + "' id: '" + i.id +
            "' manufacturer: '" + i.manufacturer + "' name: '" + i.name +
            "' version: '" + i.version + "']");
        return i;
    }

    /**
     * When a midi connection is changed
     * @param event
     * @returns the event
     */
    private OnStateChange(event) {
        if (event.port.type == "input"){
            console.log("MIDI Controller", event.port.name, "port", event.port, "state", event.port.state);
            //TODO: Change this to blokdust tooltip message
        }
        return event;
    }

    MidiVelocityToGain(velocity){
        return velocity/127;
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"midi");
    }

    Attach(source: ISource): void {

        if (!((source instanceof Power) || (source instanceof Microphone))) {
            this.CreateVoices(source);
        }
    }

    Detach(source: ISource): void {
        source.TriggerRelease('all'); //todo:

    }

    KeyboardDown(keyDown:string, source:ISource): void {

        var frequency = this.GetFrequencyOfNote(keyDown, source);

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

        var keyUpFrequency = this.GetFrequencyOfNote(keyUp, source);
        var thisPitch = source.GetPitch();

        if (Object.keys(this.KeysDown).length === 0) {
            source.TriggerRelease();
        }
    }

    Dispose(){
        super.Dispose();
        this.Midi = null;
        this.Data = null;
        this.VoicesAmount = null;
    }

    CreateVoices(source: ISource){

        // Work out how many voices we actually need (we may already have some)
        var diff = this.VoicesAmount - source.Sources.length;

        // If we haven't got enough sources, create however many we need.
        if (diff > 0){

            // Loop through and create the voices
            for (var i = 1; i <= this.VoicesAmount; i++) {

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

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "MIDI Keyboard",
            //"parameters" : [
            //
            //    {
            //        "type" : "slider",
            //        "name" : "Octave",
            //        "setting" :"octave",
            //        "props" : {
            //            "value" : this.Params.octave,
            //            "min" : 0,
            //            "max" : 9,
            //            "quantised" : true,
            //            "centered" : false
            //        }
            //    },
            //]
        };
    }

}

export = MIDIController;