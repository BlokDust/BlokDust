import MIDIMessageArgs = require('./MIDIMessageArgs');

class MIDIManager {

    public HasMIDICapability: boolean = false;
    public MIDI: WebMidi.MIDIAccess;
    public MIDIMessage = new nullstone.Event<MIDIMessageArgs>();

    public Init() {
        // request MIDI access
        if(navigator.requestMIDIAccess !== undefined){
            this.HasMIDICapability = true;
            if (App.Audio.MIDIManager.HasMIDICapability) {
                navigator.requestMIDIAccess({sysex: false})
                    .then(this._OnMIDIInit.bind(this), this._OnMIDIFailure.bind(this));

                console.log('MIDI ready');
            } else {
                // No MIDI capability
                console.log("No access to MIDI devices or your browser doesn't support WebMIDI API");
            }
        } else {
            this.HasMIDICapability = false;
        }
    }

    /**
     * On MIDI ready initialize
     * @param midi {WebMidi.MIDIAccess}
     */
    private _OnMIDIInit(midi: WebMidi.MIDIAccess) {
        this.MIDI = midi;
        console.log('MIDI success', this.MIDI);
        this.HookUpMIDIInput();
        this.MIDI.onstatechange = this.HookUpMIDIInput.bind(this);
    }

    /**
     * Loops through all connected MIDI inputs, binds onMidiMessage and displays the device info
     */
    public HookUpMIDIInput() {
        var inputs = this.MIDI.inputs.values();
        for ( var input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = this._OnMIDIMessage.bind(this);
            // Show this input
            MIDIManager.DisplayInput(input.value);
        }
    }

    /**
     * Browser doesn't support WebMIDI API event
     * @param error - Event
     * @constructor
     */
    private _OnMIDIFailure(error) {
        // when we get a failed response, run this code
        this.HasMIDICapability = false;
        console.error(error);
    }

    /**
     * MIDI Message received callback
     * @param e {MIDIMessageEvent}
     */
    private _OnMIDIMessage(e: WebMidi.MIDIMessageEvent) {

        var cmd = e.data[0] >> 4,// this gives us our [command/channel, note, velocity] data.
            channel = e.data[0] & 0xf,
            type = e.data[0] & 0xf0, // channel agnostic message type. Thanks, Phil Burk.
            note = App.Audio.Tone.midiToNote(e.data[1]),
            velocity = e.data[2];

        var MessageArgs: WebMidi.MIDIMessageArgs = {
            cmd: e.data[0] >> 4,// this gives us our [command/channel, note, velocity] data.
            channel: e.data[0] & 0xf,
            type: e.data[0] & 0xf0, // channel agnostic message type. Thanks, Phil Burk.
            note: App.Audio.Tone.midiToNote(e.data[1]),
            velocity: e.data[2],
        };

        this.MIDIMessage.raise(this, new MIDIMessageArgs(MessageArgs));

        console.log(
            'cmd:', cmd,
            'channel:', channel,
            'type:', type,
            'note:', note,
            'velocity', velocity
        );
    }

    /**
     * Displays the connected MIDI input device
     * @param i {WebMidi.MIDIPort}: MIDI input value
     * @return input Object
     */
    public static DisplayInput(i: WebMidi.MIDIPort){
        console.log(`Input port: [
            type: + ${i.type}
            id: ${i.id}
            manufacturer: ${i.manufacturer}
            name: ${i.name}
            version: ${i.version}
        ]`);
        if (App.Message){
            App.Message(`MIDI Controller: ${i.manufacturer}  ${i.name} connected`);
        }
        return i;
    }
}
export = MIDIManager;