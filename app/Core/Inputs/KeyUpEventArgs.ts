export class KeyUpEventArgs implements nullstone.IEventArgs {

    public KeyUp: string;

    constructor (keyUp: string) {
        Object.defineProperty(this, 'KeyUp', { value: keyUp, writable: false });
    }
}
