/// <reference path="PropertyStore.ts" />

module Fayde.Providers {
    export interface IDataContextStorage extends IPropertyStorage {
        InheritedValue: any;
    }

    export class DataContextStore extends PropertyStore {
        static Instance: DataContextStore;
        GetValue(storage: IDataContextStorage): any {
            var val = super.GetValue(storage);
            if (val === undefined)
                val = storage.InheritedValue;
            return val;
        }
        GetValuePrecedence(storage: IDataContextStorage): PropertyPrecedence {
            var prec = super.GetValuePrecedence(storage);
            if (prec < PropertyPrecedence.InheritedDataContext)
                return prec;
            if (storage.InheritedValue !== undefined)
                return PropertyPrecedence.InheritedDataContext;
            return PropertyPrecedence.DefaultValue;
        }
        OnInheritedChanged(storage: IDataContextStorage, newInherited?: any) {
            var oldInherited = storage.InheritedValue;
            storage.InheritedValue = newInherited;
            if (storage.Precedence >= PropertyPrecedence.InheritedDataContext && oldInherited !== newInherited)
                this.OnPropertyChanged(storage, PropertyPrecedence.InheritedDataContext, oldInherited, newInherited);
        }

        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IDataContextStorage {
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

        OnPropertyChanged(storage: IDataContextStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any): IDependencyPropertyChangedEventArgs {
            var args = super.OnPropertyChanged(storage, effectivePrecedence, oldValue, newValue);
            if (args) {
                if (effectivePrecedence > PropertyPrecedence.LocalValue && this.TryUpdateDataContextExpression(storage, args.NewValue))
                    return;
                storage.OwnerNode.OnDataContextChanged(args.OldValue, args.NewValue);
            }
            return args;
        }

        private TryUpdateDataContextExpression(storage: IDataContextStorage, newDataContext: any): boolean {
            var val = storage.InheritedValue;
            var exprs = <Expression[]>(<any>storage.OwnerNode.XObject)._Expressions;
            var dcexpr = exprs[storage.Property._ID];
            if (!dcexpr)
                return false;
            dcexpr.OnDataContextChanged(newDataContext);
            return true;
        }
    }
    DataContextStore.Instance = new DataContextStore();
}