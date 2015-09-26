export class FocusManagerEventArgs implements nullstone.IEventArgs {

    HasFocus: boolean;

    constructor (hasFocus: boolean) {
        Object.defineProperty(this, 'HasFocus', { value: hasFocus, writable: false });
    }
}
