export class MIDIMessageArgs implements nullstone.IEventArgs {

    MIDI: WebMidi.MIDIMessageArgs;

    constructor (MIDI: WebMidi.MIDIMessageArgs) {
        Object.defineProperty(this, 'MIDI', { value: MIDI, writable: false });
    }
}
