module Fayde {
    export interface IUIReactionCallback<T> {
        (updater: minerva.core.Updater, ov: T, nv: T, uie?: UIElement): void;
    }

    export function UIReaction<TValue>(propd: DependencyProperty, callback?: IUIReactionCallback<TValue>, listen?: boolean, sync?: (src: TValue, dest: TValue) => void, instance?: any);

    export function UIReaction<TValue>(propd: DependencyProperty, callback?: IUIReactionCallback<TValue>, listen?: boolean, sync?: boolean, instance?: any);

    export function UIReaction<TValue>(propd: DependencyProperty, callback?: IUIReactionCallback<TValue>, listen?: boolean, sync?: any, instance?: any) {
        var changed: Function;
        if (sync === false) {
            changed = (listen === false) ? reaction<TValue>(callback) : lReaction<TValue>(callback);
        } else {
            var name = propd.Name;
            name = name.charAt(0).toLowerCase() + name.substr(1);
            if (typeof sync !== "function")
                changed = (listen === false) ? sReaction<TValue>(callback, name) : slReaction<TValue>(callback, name);
            else
                changed = (listen === false) ? sReaction<TValue>(callback, name, sync) : slReaction<TValue>(callback, name, sync);
        }
        if (instance)
            propd.Store.ListenToChanged(instance, propd, <any>changed, instance);
        else
            propd.ChangedCallback = <any>changed;
    }

    function reaction<T>(callback: IUIReactionCallback<T>) {
        return (uie: UIElement, args: DependencyPropertyChangedEventArgs) => {
            callback && callback(uie.XamlNode.LayoutUpdater, args.OldValue, args.NewValue, uie);
        };
    }

    function sReaction<T>(callback: IUIReactionCallback<T>, name: string, syncer?: (src: T, dest: T) => void) {
        return (uie: UIElement, args: DependencyPropertyChangedEventArgs) => {
            var ov = args.OldValue;
            var nv = args.NewValue;
            var upd = uie.XamlNode.LayoutUpdater;
            if (!syncer)
                upd.assets[name] = nv;
            else
                syncer(nv, upd.assets[name]);
            callback && callback(upd, ov, nv, uie);
        };
    }

    function lReaction<T>(callback: IUIReactionCallback<T>) {
        return (uie: UIElement, args: DependencyPropertyChangedEventArgs) => {
            var ov = args.OldValue;
            var nv = args.NewValue;
            var upd = uie.XamlNode.LayoutUpdater;
            UnreactTo(ov, uie);
            callback && callback(upd, ov, nv, uie);
            ReactTo(nv, uie, () => callback(upd, nv, nv, uie));
        };
    }

    function slReaction<T>(callback: IUIReactionCallback<T>, name: string, syncer?: (src: T, dest: T) => void) {
        return (uie: UIElement, args: DependencyPropertyChangedEventArgs) => {
            var ov = args.OldValue;
            var nv = args.NewValue;
            var upd = uie.XamlNode.LayoutUpdater;
            UnreactTo(ov, uie);
            if (!syncer)
                upd.assets[name] = nv;
            else
                syncer(nv, upd.assets[name]);
            callback && callback(upd, ov, nv, uie);
            ReactTo(nv, uie, () => callback && callback(upd, nv, nv, uie));
        };
    }
}