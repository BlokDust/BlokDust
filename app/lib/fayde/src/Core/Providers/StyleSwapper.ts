module Fayde.Providers {
    export function SwapStyles(fe: FrameworkElement, oldWalker: IStyleWalker, newWalker: IStyleWalker, isImplicit: boolean) {
        var arr = (<IPropertyStorageOwner>fe)._PropertyStorage;
        var oldSetter = oldWalker.Step();
        var newSetter = newWalker.Step();

        var storage: IPropertyStorage;
        var value: any;
        var propd: DependencyProperty;
        while (oldSetter || newSetter) {
            if (oldSetter && newSetter) {
                switch (Setter.Compare(oldSetter, newSetter)) {
                    case 0:
                        value = newSetter.ConvertedValue;
                        propd = newSetter.Property;
                        oldSetter = oldWalker.Step();
                        newSetter = newWalker.Step();
                        break;
                    case -1:
                        value = undefined;
                        propd = oldSetter.Property;
                        oldSetter = oldWalker.Step();
                        break;
                    case 1:
                        value = newSetter.ConvertedValue;
                        propd = newSetter.Property;
                        newSetter = newWalker.Step();
                        break;
                }
            } else if (newSetter) {
                value = newSetter.ConvertedValue;
                propd = newSetter.Property;
                newSetter = newWalker.Step();
            } else /*if (oldSetter)*/ {
                value = undefined;
                propd = oldSetter.Property;
                oldSetter = oldWalker.Step();
            }

            storage = arr[propd._ID];
            if (!storage)
                storage = arr[propd._ID] = propd.Store.CreateStorage(fe, propd);
            if (isImplicit)
                propd.Store.SetImplicitStyle(storage, value);
            else
                propd.Store.SetLocalStyleValue(storage, value);
        }
    }
}