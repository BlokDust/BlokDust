/// <reference path="PropertyStore.ts" />

module Fayde.Providers {
    export class ImmutableStore extends PropertyStore {
        static Instance: ImmutableStore;

        GetValue(storage: IPropertyStorage): any {
            return storage.Local;
        }
        GetValuePrecedence(storage: IPropertyStorage): PropertyPrecedence {
            return PropertyPrecedence.LocalValue;
        }
        SetLocalValue(storage: Providers.IPropertyStorage, newValue: any) {
            console.warn("Trying to set value for immutable property.");
        }
        ClearValue(storage: Providers.IPropertyStorage) {
            console.warn("Trying to clear value for immutable property.");
        }
        ListenToChanged(target: DependencyObject, propd: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void, closure: any): Providers.IPropertyChangedListener {
            return {
                Property: propd,
                OnPropertyChanged: function (sender: DependencyObject, args: IDependencyPropertyChangedEventArgs) { },
                Detach: function () { }
            };
        }
        Clone(dobj: DependencyObject, sourceStorage: IPropertyStorage): IPropertyStorage {
            if (sourceStorage.Local instanceof XamlObjectCollection) {
                var newStorage = Providers.GetStorage(dobj, sourceStorage.Property);
                var newColl = <XamlObjectCollection<any>>newStorage.Local;
                newColl.CloneCore(<XamlObjectCollection<any>>sourceStorage.Local);
                var anims = newStorage.Animations = sourceStorage.Animations;
                if (anims) {
                    for (var i = 0; i < anims.length; i++) {
                        anims[i].PropStorage = newStorage;
                    }
                }
                return newStorage;
            } else {
                console.warn("Cloning Immutable improperly");
                return super.Clone(dobj, sourceStorage);
            }
        }
    }
    ImmutableStore.Instance = new ImmutableStore();
}