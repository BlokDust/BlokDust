/// <reference path="PropertyStore.ts" />

module Fayde.Providers {
    export interface IIsEnabledStorage extends IPropertyStorage {
        InheritedValue: boolean;
    }

    export class IsEnabledStore extends PropertyStore {
        static Instance: IsEnabledStore;
        GetValue(storage: IIsEnabledStorage): boolean {
            if (storage.InheritedValue === false)
                return false;
            return super.GetValue(storage);
        }
        GetValuePrecedence(storage: IIsEnabledStorage): PropertyPrecedence {
            if (storage.InheritedValue === false)
                return PropertyPrecedence.IsEnabled;
            return super.GetValuePrecedence(storage);
        }

        SetLocalValue(storage: IIsEnabledStorage, newValue: boolean) {
            var oldValue = storage.Local;
            storage.Local = newValue;
            if (oldValue === newValue || storage.InheritedValue === false)
                return;
            this.OnPropertyChanged(storage, PropertyPrecedence.LocalValue, oldValue, newValue);
        }

        OnPropertyChanged(storage: IPropertyStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any): IDependencyPropertyChangedEventArgs {
            var args = super.OnPropertyChanged(storage, effectivePrecedence, oldValue, newValue);
            storage.OwnerNode.OnIsEnabledChanged(oldValue, newValue);
            return args;
        }

        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IIsEnabledStorage {
            return {
                OwnerNode: dobj.XamlNode,
                Property: propd,
                Precedence: PropertyPrecedence.DefaultValue,
                InheritedValue: true,
                Animations: undefined,
                Local: undefined,
                LocalStyleValue: undefined,
                ImplicitStyleValue: undefined,
                PropListeners: undefined,
            };
        }
        
        EmitInheritedChanged(storage: IIsEnabledStorage, newInherited: boolean) {
            var oldInherited = storage.InheritedValue;
            if (newInherited !== false) {
                storage.Precedence = super.GetValuePrecedence(storage);
                storage.InheritedValue = true;
            } else {
                storage.InheritedValue = false;
            }
            if (oldInherited === newInherited)
                return;
            this.OnPropertyChanged(storage, PropertyPrecedence.IsEnabled, oldInherited, newInherited);
        }
        static EmitInheritedChanged(cn: Controls.ControlNode, value: boolean) {
            var propd = Controls.Control.IsEnabledProperty;
            var storage = <Providers.IIsEnabledStorage>Providers.GetStorage(cn.XObject, propd);
            (<Providers.IsEnabledStore>propd.Store).EmitInheritedChanged(storage, value);
        }
    }
    IsEnabledStore.Instance = new IsEnabledStore();
}