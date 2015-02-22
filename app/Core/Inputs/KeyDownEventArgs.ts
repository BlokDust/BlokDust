
class KeyDownEventArgs implements nullstone.IEventArgs {

    KeyDown: string;

    constructor (keyDown: string) {
        Object.defineProperty(this, 'KeyDown', { value: keyDown, writable: false });
    }
}

export = KeyDownEventArgs;
