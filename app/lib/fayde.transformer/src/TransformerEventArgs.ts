module Fayde.Transformer {

    export class TransformerEventArgs implements nullstone.IEventArgs {
        Transforms: TransformGroup;

        constructor (transforms: TransformGroup) {
            Object.defineProperty(this, 'Transforms', {value: transforms, writable: false});
        }
    }
}