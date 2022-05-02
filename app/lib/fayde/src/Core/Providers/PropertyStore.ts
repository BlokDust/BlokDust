
module Fayde.Providers {
    export enum PropertyPrecedence {
        IsEnabled = 0,
        LocalValue = 1,
        LocalStyle = 2,
        ImplicitStyle = 3,
        Inherited = 4,
        InheritedDataContext = 5,
        DefaultValue = 6,

        Lowest = 6,
        Highest = 0,
        Count = 7,
    }
    
    export interface IPropertyChangedListener {
        Property: DependencyProperty;
        OnPropertyChanged(sender: DependencyObject, args: IDependencyPropertyChangedEventArgs);
        Detach();
    }

    export interface IPropertyStorage {
        OwnerNode: DONode;
        Property: DependencyProperty;
        Precedence: PropertyPrecedence;
        Animations: Media.Animation.IAnimationStorage[];
        Local: any;
        LocalStyleValue: any;
        ImplicitStyleValue: any;
        PropListeners: IPropertyChangedListener[];
    }

    export interface IPropertyStorageOwner {
        _PropertyStorage: IPropertyStorage[];
    }

    export function GetStorage(dobj: DependencyObject, propd: DependencyProperty): IPropertyStorage {
        var arr = (<IPropertyStorageOwner>dobj)._PropertyStorage;
        var storage = arr[propd._ID];
        if (!storage) arr[propd._ID] = storage = propd.Store.CreateStorage(dobj, propd);
        return storage;
    }

    export class PropertyStore {
        static Instance: PropertyStore;
        GetValue(storage: IPropertyStorage): any {
            var val: any;
            if ((val = storage.Local) !== undefined)
                return val;
            if ((val = storage.LocalStyleValue) !== undefined)
                return val;
            if ((val = storage.ImplicitStyleValue) !== undefined)
                return val;
            return storage.Property.DefaultValue;
        }
        GetValuePrecedence(storage: IPropertyStorage): PropertyPrecedence {
            if (storage.Local !== undefined)
                return PropertyPrecedence.LocalValue;
            if (storage.LocalStyleValue !== undefined)
                return PropertyPrecedence.LocalStyle;
            if (storage.ImplicitStyleValue !== undefined)
                return PropertyPrecedence.ImplicitStyle;
            return PropertyPrecedence.DefaultValue;
        }

        SetLocalValue(storage: Providers.IPropertyStorage, newValue: any) {
            if (newValue === undefined || newValue === DependencyProperty.UnsetValue) {
                this.ClearValue(storage);
                return;
            }

            var propd = storage.Property;
            if (newValue && propd.GetTargetType() === String) {
                if (typeof newValue !== "string")
                    newValue = newValue.toString();
                //TODO: More type checks
            }

            var isValidOut = { IsValid: false };
            newValue = propd.ValidateSetValue(storage.OwnerNode.XObject, newValue, isValidOut);
            if (!isValidOut.IsValid)
                return;

                
            var precDiff = storage.Precedence - PropertyPrecedence.LocalValue;
            if (!propd.AlwaysChange && precDiff < 0) {
                storage.Local = newValue;
                return;
            }

            var oldValue = undefined;
            if (precDiff > 0)
                oldValue = this.GetValue(storage);
            else
                oldValue = storage.Local;
            storage.Local = newValue;
            this.OnPropertyChanged(storage, PropertyPrecedence.LocalValue, oldValue, newValue);
        }
        SetLocalStyleValue(storage: IPropertyStorage, newValue: any) {
            var precDiff = storage.Precedence - PropertyPrecedence.LocalStyle;
            if (precDiff < 0) {
                storage.LocalStyleValue = newValue;
                return;
            }

            var oldValue = undefined;
            if (precDiff > 0)
                oldValue = this.GetValue(storage);
            else
                oldValue = storage.LocalStyleValue;
            storage.LocalStyleValue = newValue;
            this.OnPropertyChanged(storage, PropertyPrecedence.LocalStyle, oldValue, newValue);
        }
        SetImplicitStyle(storage: IPropertyStorage, newValue: any) {
            var precDiff = storage.Precedence - PropertyPrecedence.ImplicitStyle;
            if (precDiff < 0) {
                storage.ImplicitStyleValue = newValue;
                return;
            }

            var oldValue = undefined;
            if (precDiff > 0)
                oldValue = this.GetValue(storage);
            else
                oldValue = storage.ImplicitStyleValue;
            storage.ImplicitStyleValue = newValue;
            this.OnPropertyChanged(storage, PropertyPrecedence.ImplicitStyle, oldValue, newValue);
        }

        ClearValue(storage: Providers.IPropertyStorage) {
            var oldLocal = storage.Local;
            if (oldLocal === undefined)
                return;
            storage.Local = undefined;
            this.OnPropertyChanged(storage, PropertyPrecedence.LocalValue, oldLocal, undefined);
        }

        OnPropertyChanged(storage: IPropertyStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any): IDependencyPropertyChangedEventArgs {
            var propd = storage.Property;
            if (newValue === undefined) {
                effectivePrecedence = this.GetValuePrecedence(storage);
                newValue = this.GetValue(storage);
            }
            
            storage.Precedence = effectivePrecedence;
            if (!propd.AlwaysChange && oldValue === newValue)
                return undefined;

            if (!storage.Property.IsCustom) {
                if (oldValue instanceof XamlObject)
                    (<XamlObject>oldValue).XamlNode.Detach();
                if (newValue instanceof XamlObject) {
                    var error = new BError();
                    if (!(<XamlObject>newValue).XamlNode.AttachTo(storage.OwnerNode, error))
                        error.ThrowException();
                }
            }

            var args = {
                Property: propd,
                OldValue: oldValue,
                NewValue: newValue
            };
            var sender = storage.OwnerNode.XObject;
            if (propd.ChangedCallback)
                propd.ChangedCallback(sender, args);
            var listeners = storage.PropListeners;
            if (listeners) {
                var len = listeners.length;
                for (var i = 0; i < len; i++) {
                    listeners[i].OnPropertyChanged(sender, args);
                }
            }
            return args;
        }
        ListenToChanged(target: DependencyObject, propd: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void , closure: any): Providers.IPropertyChangedListener {
            var storage = GetStorage(target, propd);
            var listeners = storage.PropListeners;
            if (!listeners) listeners = storage.PropListeners = [];

            var listener = {
                Detach: function () {
                    var index = listeners.indexOf(listener);
                    if (index > -1)
                        listeners.splice(index, 1);
                },
                Property: propd,
                OnPropertyChanged: function (sender: DependencyObject, args: IDependencyPropertyChangedEventArgs) { func.call(closure, sender, args); }
            };
            listeners.push(listener);
            return listener;
        }

        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IPropertyStorage {
            return {
                OwnerNode: dobj.XamlNode,
                Property: propd,
                Precedence: PropertyPrecedence.DefaultValue,
                Animations: undefined,
                Local: undefined,
                LocalStyleValue: undefined,
                ImplicitStyleValue: undefined,
                PropListeners: undefined,
            };
        }
        Clone(dobj: DependencyObject, sourceStorage: IPropertyStorage): IPropertyStorage {
            var newStorage = this.CreateStorage(dobj, sourceStorage.Property);
            newStorage.Precedence = sourceStorage.Precedence;
            //newStorage.ImplicitStyleValue = undefined;
            //newStorage.LocalStyleValue = undefined;
            newStorage.Local = Fayde.Clone(sourceStorage.Local);
            var anims = newStorage.Animations = sourceStorage.Animations;
            if (anims) {
                for (var i = 0; i < anims.length; i++) {
                    anims[i].PropStorage = newStorage;
                }
            }
            //TODO: Copy over property listeners?
            return newStorage;
        }
    }
    PropertyStore.Instance = new PropertyStore();
}