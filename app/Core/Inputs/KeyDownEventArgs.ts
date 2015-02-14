
class KeyDownEventArgs implements nullstone.IEventArgs {
    KeysDown: any[];
    KeyDown: string;


    constructor (keyDown: string) {
        Object.defineProperty(this, 'KeyDown', { value: keyDown, writable: false });
    }
}

export = KeyDownEventArgs;
