class MIDIMessageArgs implements nullstone.IEventArgs {

    e: WebMidi.MIDIMessageArgs;

    constructor (e: WebMidi.MIDIMessageArgs) {
        Object.defineProperty(this, 'e', { value: e, writable: false });
    }
}

export = MIDIMessageArgs;
