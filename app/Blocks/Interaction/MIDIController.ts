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

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                glide: 0.05,
                polyphonic: 0, // Polyphonic mode: boolean, default: off
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
    private OnMIDIMessage(e) {
        var cmd = e.data[0] >> 4,// this gives us our [command/channel, note, velocity] data.
            channel = e.data[0] & 0xf,
            type = e.data[0] & 0xf0, // channel agnostic message type. Thanks, Phil Burk.
            note = App.AudioMixer.Master.midiToNote(e.data[1]),
            velocity = e.data[2];

        console.log(
            'cmd:', cmd,
            'channel:', channel,
            'type:', type,
            'note:', note,
            'velocity', velocity
        );

        if (channel == 9) return;

        if (cmd == 8 || ((cmd == 9) && (velocity == 0))) {
            // with MIDI, note on with velocity zero is the same as note off
            // Key up type

            //Check if this key released is in out key_map
            if (typeof note !== 'undefined' && note !== '') {
                // remove this key from the keysDown object
                delete this.KeysDown[note];
            }

            // ALL SOURCES TRIGGER KEYBOARD UP
            if (this.Sources.Count) {
                for (var i = 0; i < this.Sources.Count; i++) {
                    var source = this.Sources.GetValueAt(i);
                    this.KeyboardUp(note, source);
                }
            }
        }

        else if (cmd === 9) {
            // Key down command

            this.KeysDown[note] = true;

            // ALL SOURCES TRIGGER KEYBOARD DOWN
            if (this.Sources.Count) {
                for (var i = 0; i < this.Sources.Count; i++) {
                    var source = this.Sources.GetValueAt(i);
                    this.KeyboardDown(note, source);
                }
            }


        }
        // TODO: add controller, pitchwheel and polyaftertouch cases.
        // https://github.com/cwilso/midi-synth/blob/master/js/midi.js line 7
        //
        //else if (cmd == 11) {
        //    controller(note, velocity / 127.0);
        //}
        //else if (cmd == 14) {
        //    // pitch wheel
        //    pitchWheel(((velocity * 128.0 + note) - 8192) / 8192.0);
        //}
        //else if (cmd == 10) {  // poly aftertouch
        //    polyPressure(note, velocity / 127)
        //}
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

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"midi controller");
    }

    Attach(source: ISource): void {
        if (!((source instanceof Power) || (source instanceof Microphone))) {
            this.CreateVoices(source);
        }
    }

    Detach(source: ISource): void {
        source.TriggerRelease('all');
        super.Detach(source);
    }

    KeyboardDown(keyDown:string, source:ISource): void {

        var frequency = this.GetFrequencyOfNote(keyDown, source);

        if (this.Params.isPolyphonic) {
            // POLYPHONIC MODE

            // Are there any free voices?
            if (source.FreeVoices.length > 0){

                // Yes, get one of them and remove it from FreeVoices list
                var voice = source.FreeVoices.shift();

                // Add it to the ActiveVoices list
                source.ActiveVoices.push( voice );

                // set it to the right frequency
                source.SetPitch(frequency, voice.ID);

                // trigger it's envelope
                source.TriggerAttack(voice.ID);

            } else {

                // No free voices available - steal the oldest one from active voices
                var voice: Voice = source.ActiveVoices.shift();

                // Set the new pitch
                source.SetPitch(frequency, voice.ID);

                // Add it back to the end of ActiveVoices
                source.ActiveVoices.push( voice );
            }

        } else {
            // MONOPHONIC MODE

            // If no other keys already pressed trigger attack
            if (Object.keys(this.KeysDown).length === 1) {
                source.SetPitch(frequency);
                source.TriggerAttack();

                // Else ramp to new frequency over time (glide)
            } else {
                source.SetPitch(frequency, 0, this.Params.glide);
            }
        }
    }

    KeyboardUp(keyUp:string, source:ISource): void {

        if (this.Params.isPolyphonic) {
            // POLYPHONIC MODE

            var keyPressed = this.GetKeyNoteOctaveString(keyUp);
            var keyUpFrequency = this.GetFrequencyOfNote(keyPressed, source);

            // Loop through all the active voices
            source.ActiveVoices.forEach((voice: Voice, i: number) => {

                var thisPitch = source.GetPitch(voice.ID)? source.GetPitch(voice.ID) : 0;

                // if this active voice has the same frequency as the frequency corresponding to the keyUp
                if (Math.round(thisPitch) === Math.round(keyUpFrequency)) {
                    // stop it
                    source.TriggerRelease(voice.ID);

                    // Remove voice from Active Voices
                    source.ActiveVoices.splice(i, 1);

                    // Add it to FreeVoices
                    source.FreeVoices.push(voice);
                }
            });

        } else {
            // MONOPHONIC MODE

            if (Object.keys(this.KeysDown).length === 0) {
                source.TriggerRelease();
            }
        }
    }

    Dispose(){
        super.Dispose();
        this.Midi = null;
        this.Data = null;
        this._Cmd = null;
        this._Channel = null;
        this._Type = null;
        this._Note = null;
        this._Velocity = null;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "MIDI Keyboard",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Mono/Polyphonic",
                    "setting" :"polyphonic",
                    "props" : {
                        "value" : this.Params.polyphonic,
                        "min" : 0,
                        "max" : 1,
                        "quantised" : true
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Octave",
                    "setting" :"octave",
                    "props" : {
                        "value" : this.Params.octave,
                        "min" : 0,
                        "max" : 9,
                        "quantised" : true,
                        "centered" : false
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Glide",
                    "setting" :"glide",
                    "props" : {
                        "value" : this.Params.glide*100,
                        "min" : 0.001,
                        "max" : 100,
                        "truemin" : 0,
                        "truemax" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                },
            ]
        };
    }

}

export = MIDIController;