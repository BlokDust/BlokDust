module Fayde.Drawing {
    export class SketchDrawEventArgs implements nullstone.IEventArgs {
        SketchSession: SketchSession;

        constructor (session: SketchSession) {
            Object.defineProperty(this, 'SketchSession', { value: session, writable: false });
        }
    }
}