export class KeyDownEventArgs implements nullstone.IEventArgs {

    public KeyDown: number;

    constructor (keyDown: number) {
        Object.defineProperty(this, 'KeyDown', { value: keyDown, writable: false });
    }
}