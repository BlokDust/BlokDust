
class KeyUpEventArgs implements nullstone.IEventArgs {

    KeyUp: string;

    constructor (keyUp: string) {
        Object.defineProperty(this, 'KeyUp', { value: keyUp, writable: false });
    }
}

export = KeyUpEventArgs;
