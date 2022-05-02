module Fayde {
    export function UIReactionAttached<TValue>(propd: DependencyProperty, callback?: IUIReactionCallback<TValue>) {
        propd.ChangedCallback = reaction<TValue>(nullstone.getTypeName(propd.OwnerType) + '.' + propd.Name, callback);
    }

    function reaction<T>(name: string, callback?: IUIReactionCallback<T>) {
        return (uie: UIElement, args: DependencyPropertyChangedEventArgs) => {
            var ov = args.OldValue;
            var nv = args.NewValue;
            var upd = uie.XamlNode.LayoutUpdater;
            upd.setAttachedValue(name, nv);
            callback && callback(upd, ov, nv, uie);
        };
    }
}