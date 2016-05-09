export class CompositionLoadFailedEventArgs implements nullstone.IEventArgs {

    public CompositionId: string;

    constructor (compositionId: string) {
        Object.defineProperty(this, 'CompositionId', { value: compositionId, writable: false });
    }
}