export class KeyUpEventArgs implements nullstone.IEventArgs {

    public KeyUp: number;

    constructor (keyUp: number) {
        Object.defineProperty(this, 'KeyUp', { value: keyUp, writable: false });
    }
}
