/// <reference path="PropertyStore.ts" />

module Fayde.Providers {
    export interface IInheritedStorage extends IPropertyStorage {
        InheritedValue: any;
    }

    export interface IIsPropertyInheritable {
        IsInheritable(propd: DependencyProperty): boolean;
    }

    export class InheritedStore extends PropertyStore {
        static Instance: InheritedStore;
        GetValue(storage: IInheritedStorage): any {
            var val: any;
            if ((val = storage.Local) !== undefined)
                return val;
            if ((val = storage.LocalStyleValue) !== undefined)
                return val;
            if ((val = storage.ImplicitStyleValue) !== undefined)
                return val;
            if ((val = storage.InheritedValue) !== undefined)
                return val;
            return storage.Property.DefaultValue;
        }
        GetValuePrecedence(storage: IInheritedStorage): PropertyPrecedence {
            var prec = super.GetValuePrecedence(storage);
            if (prec < PropertyPrecedence.Inherited)
                return prec;
            if (storage.InheritedValue !== undefined)
                return PropertyPrecedence.Inherited;
            return PropertyPrecedence.DefaultValue;
        }

        OnPropertyChanged(storage: IPropertyStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any): IDependencyPropertyChangedEventArgs {
            var args = super.OnPropertyChanged(storage, effectivePrecedence, oldValue, newValue);
            if (effectivePrecedence <= PropertyPrecedence.Inherited)
                this.Propagate(storage.OwnerNode, storage.Property, newValue);
            return args;
        }

        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IInheritedStorage {
            return {
                OwnerNode: dobj.XamlNode,
                Property: propd,
                Precedence: PropertyPrecedence.DefaultValue,
                Animations: undefined,
                Local: undefined,
                LocalStyleValue: undefined,
                ImplicitStyleValue: undefined,
                InheritedValue: undefined,
                PropListeners: undefined,
            };
        }

        static PropagateInheritedOnAdd(dobj: DependencyObject, subtreeNode: DONode) {
            var destination = subtreeNode.XObject;
            var store: InheritedStore = InheritedStore.Instance;
            var arr = (<IPropertyStorageOwner>destination)._PropertyStorage;
            var storage: IPropertyStorage;

            var allProps = InheritableOwner.AllInheritedProperties;
            var len = allProps.length;
            var propd: DependencyProperty;
            var newValue: any;
            var sourceNode: XamlNode;
            for (var i = 0; i < len; i++) {
                propd = allProps[i];
                sourceNode = dobj.XamlNode;
                while (sourceNode && !((<IIsPropertyInheritable>sourceNode.XObject).IsInheritable(propd))) {
                    sourceNode = sourceNode.ParentNode;
                }
                if (!sourceNode)
                    continue;
                newValue = (<DependencyObject>sourceNode.XObject).GetValue(propd);
                if (newValue === propd.DefaultValue)
                    continue;

                storage = arr[propd._ID];
                if (!storage) storage = arr[propd._ID] = store.CreateStorage(destination, propd);
                if (!store.SetInheritedValue(subtreeNode, propd, newValue))
                    store.Propagate(subtreeNode, propd, newValue);
            }
        }
        static ClearInheritedOnRemove(dobj: DependencyObject, subtreeNode: DONode) {
            var store: InheritedStore = InheritedStore.Instance;
            var allProps = InheritableOwner.AllInheritedProperties;
            var len = allProps.length;
            var propd: DependencyProperty;
            for (var i = 0; i < len; i++) {
                propd = allProps[i];
                if (!store.SetInheritedValue(subtreeNode, propd, undefined))
                    store.Propagate(subtreeNode, propd, undefined);
            }
        }
        private Propagate(ownerNode: XamlNode, propd: DependencyProperty, newValue: any) {
            var enumerator = ownerNode.GetInheritedEnumerator();
            var uin: UINode;
            while (enumerator.moveNext()) {
                uin = <UINode>enumerator.current;
                if (!this.SetInheritedValue(uin, propd, newValue))
                    this.Propagate(uin, propd, newValue);
            }
        }
        private SetInheritedValue(don: DONode, propd: DependencyProperty, newValue: any): boolean {
            /// Returns false if object doesn't understand this inheritable property
            var dobj = don.XObject;
            if (!(<IIsPropertyInheritable>dobj).IsInheritable(propd))
                return false;
            var storage = <IInheritedStorage>GetStorage(dobj, propd);
            if (storage.Precedence < PropertyPrecedence.Inherited) {
                //Overriden locally, don't propagate
                storage.InheritedValue = newValue;
                return true;
            }
            var oldValue = storage.InheritedValue;
            if (oldValue === undefined) oldValue = propd.DefaultValue;
            storage.InheritedValue = newValue;
            storage.Precedence = PropertyPrecedence.Inherited;
            this.OnPropertyChanged(storage, PropertyPrecedence.Inherited, oldValue, newValue);
            return true;
        }
    }
    InheritedStore.Instance = new InheritedStore();
}