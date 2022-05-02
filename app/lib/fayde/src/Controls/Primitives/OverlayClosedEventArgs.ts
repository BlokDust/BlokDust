module Fayde.Controls.Primitives {
    export class OverlayClosedEventArgs implements nullstone.IEventArgs {
        Result: boolean;
        Data: any;

        constructor (result: boolean, data: any) {
            Object.defineProperties(this, {
                "Result": {
                    value: result,
                    writable: false
                },
                "Data": {
                    value: data,
                    writable: false
                }
            });
        }
    }
}