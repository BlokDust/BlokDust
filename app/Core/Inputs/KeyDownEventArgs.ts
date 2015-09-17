export class KeyDownEventArgs implements nullstone.IEventArgs {

    public KeyDown: string;

    constructor (keyDown: string) {
        Object.defineProperty(this, 'KeyDown', { value: keyDown, writable: false });
    }
}