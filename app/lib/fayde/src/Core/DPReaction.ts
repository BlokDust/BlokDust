module Fayde {
    export interface IDPReactionCallback<T> {
        (dobj: DependencyObject, ov: T, nv: T): void;
    }

    export function DPReaction<TValue>(propd: DependencyProperty, callback?: IDPReactionCallback<TValue>, listen?: boolean) {
        if (listen === false) {
            propd.ChangedCallback = reaction<TValue>(callback);
        } else {
            propd.ChangedCallback = lReaction<TValue>(callback);
        }
    }

    function reaction<T>(callback: IDPReactionCallback<T>) {
        return (dobj: DependencyObject, args: DependencyPropertyChangedEventArgs) => {
            callback && callback(dobj, args.OldValue, args.NewValue);
        };
    }

    function lReaction<T>(callback: IDPReactionCallback<T>) {
        return (dobj: DependencyObject, args: DependencyPropertyChangedEventArgs) => {
            var ov = args.OldValue;
            var nv = args.NewValue;
            UnreactTo(ov, dobj);
            callback && callback(dobj, ov, nv);
            ReactTo(nv, dobj, () => callback(dobj, nv, nv));
        };
    }
}