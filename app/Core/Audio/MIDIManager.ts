import {IApp} from '../../IApp';
import {MIDIMessageArgs} from './MIDIMessageArgs';

declare var App: IApp;

export class MIDIManager {

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
        var i = 0;
        var inputs = this.MIDI.inputs.values();
        for ( var input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = this._OnMIDIMessage.bind(this);
            // Show this input
            console.log(input);
            //TODO: Would prefer to only call this once
            if (i === 0) MIDIManager.DisplayInput(input.value);
            i++;
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
        console.log(error);
    }

    /**
     * MIDI Message received callback
     * @param e {MIDIMessageEvent}
     */
    private _OnMIDIMessage(e: WebMidi.MIDIMessageEvent) {

        //var cmd = e.data[0] >> 4,// this gives us our [command/channel, note, velocity] data.
        //    channel = e.data[0] & 0xf,
        //    type = e.data[0] & 0xf0, // channel agnostic message type. Thanks, Phil Burk.
        //    note = App.Audio.Tone.midiToNote(e.data[1]),
        //    velocity = e.data[2];

        var args: WebMidi.MIDIMessageArgs = {
            cmd: e.data[0] >> 4,// this gives us our [command/channel, note, velocity] data.
            channel: e.data[0] & 0xf,
            type: e.data[0] & 0xf0, // channel agnostic message type. Thanks, Phil Burk.
            //note: App.Audio.Tone.midiToNote(e.data[1]),
            note: e.data[1],
            velocity: e.data[2],
        };

        this.MIDIMessage.raise(this, new MIDIMessageArgs(args));
    }

    /**
     * Displays the connected MIDI input device
     * @param i {WebMidi.MIDIPort}: MIDI input value
     * @return input Object
     */
    public static DisplayInput(i: WebMidi.MIDIPort){
        if (typeof App.Message === 'function'){
            //TODO: Use debounce here. This gets called a few times
            // Set timeout is needed to accurately gauge the midi state. If called instantly the state is always 'connected'
            setTimeout(() => {
                App.Message(`MIDI Controller: ${i.name} ${i.state}`);
                console.log(`Input port: [
                    type: + ${i.type}
                    id: ${i.id}
                    manufacturer: ${i.manufacturer}
                    name: ${i.name}
                    version: ${i.version}
                    state: ${i.state}
                ]`);
            }, 250);
        }
        return i;
    }
}