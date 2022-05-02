/// <reference path="XamlNode.ts" />
/// <reference path="XamlObject.ts" />
/// <reference path="DependencyProperty.ts" />
/// <reference path="Providers/PropertyStore.ts" />
/// <reference path="Providers/DataContextStore.ts" />
/// <reference path="DPReaction.ts" />
/// <reference path="../Runtime/React.ts" />

module Fayde {
    export class DONode extends XamlNode {
        XObject: DependencyObject;
        constructor(xobj: DependencyObject) {
            super(xobj);
        }

        OnParentChanged(oldParentNode: XamlNode, newParentNode: XamlNode) {
            super.OnParentChanged(oldParentNode, newParentNode);
            var propd = DependencyObject.DataContextProperty;
            var storage = <Providers.IDataContextStorage>Providers.GetStorage(this.XObject, propd);
            var newInherited = newParentNode ? newParentNode.DataContext : undefined;
            (<Providers.DataContextStore>propd.Store).OnInheritedChanged(storage, newInherited);
        }

        get DataContext(): any { return this.XObject.DataContext; }
        set DataContext(value: any) {
            var propd = DependencyObject.DataContextProperty;
            var storage = <Providers.IDataContextStorage>Providers.GetStorage(this.XObject, propd);
            (<Providers.DataContextStore>propd.Store).OnInheritedChanged(storage, value);
        }
        OnDataContextChanged(oldDataContext: any, newDataContext: any) {
            var dcpid = DependencyObject.DataContextProperty._ID.toString();
            var exprs = <Expression[]>(<any>this.XObject)._Expressions;
            var expr: Expression;
            for (var id in exprs) {
                expr = exprs[id];
                if (!(expr instanceof Expression))
                    continue;
                //DataContextProperty expressions are updated in DataContextStore
                if (id === dcpid)
                    continue;
                expr.OnDataContextChanged(newDataContext);
            }
            super.OnDataContextChanged(oldDataContext, newDataContext);
        }
    }

    export class DependencyObject extends XamlObject implements ICloneable, Providers.IPropertyStorageOwner {
        private _Expressions: Expression[] = [];
        _PropertyStorage: Providers.IPropertyStorage[] = [];

        static DataContextProperty = DependencyProperty.Register("DataContext", () => Object, DependencyObject);
        DataContext: any;

        constructor() {
            super();
        }
        XamlNode: DONode;
        CreateNode(): DONode { return new DONode(this); }

        GetValue(propd: DependencyProperty): any {
            if (!propd)
                throw new ArgumentException("No property specified.");
            var storage = Providers.GetStorage(this, propd);
            return propd.Store.GetValue(storage);
        }
        SetValue(propd: DependencyProperty, value: any) {
            if (!propd)
                throw new ArgumentException("No property specified.");
            if (propd.IsReadOnly)
                throw new InvalidOperationException("DependencyProperty '" + (<any>propd.OwnerType).name + "." + propd.Name + "' is read only.");
            this.SetValueInternal(propd, value);
        }
        SetValueInternal(propd: DependencyProperty, value: any) {
            var expression: Expression;
            if (value instanceof Expression) {
                expression = value;
                expression.Seal(this, propd);
            }

            var existing = this._Expressions[propd._ID];

            var updateTwoWay = false;
            var addingExpression = false;
            if (expression) {
                if (expression !== existing) {
                    if (expression.IsAttached)
                        throw new ArgumentException("Cannot attach the same Expression to multiple FrameworkElements");

                    if (existing)
                        this._RemoveExpression(propd);
                    this._AddExpression(propd, expression);
                }
                addingExpression = true;
                value = expression.GetValue(propd);
            } else if (existing) {
                if (existing instanceof Data.BindingExpressionBase) {
                    var binding = (<Data.BindingExpressionBase>existing).ParentBinding;
                    if (binding.Mode === Data.BindingMode.TwoWay) {
                        updateTwoWay = !existing.IsUpdating && !propd.IsCustom;
                    } else if (!existing.IsUpdating || binding.Mode === Data.BindingMode.OneTime) {
                        this._RemoveExpression(propd);
                    }
                } else if (!existing.IsUpdating) {
                    this._RemoveExpression(propd);
                }
            }

            var storage = Providers.GetStorage(this, propd);
            try {
                propd.Store.SetLocalValue(storage, value);
                if (updateTwoWay)
                    (<Data.BindingExpressionBase>existing)._TryUpdateSourceObject(value);
            } catch (err) {
                if (!addingExpression)
                    throw err;
                var msg = "Error setting value: " + err.toString();
                msg += err.stack;
                console.warn(msg);
                propd.Store.SetLocalValue(storage, propd.DefaultValue);
                if (updateTwoWay)
                    (<Data.BindingExpressionBase>existing)._TryUpdateSourceObject(value);
            }
        }
        SetCurrentValue(propd: DependencyProperty, value: any) {
            var storage = Providers.GetStorage(this, propd);
            propd.Store.SetLocalValue(storage, value);

            var expr = <Data.BindingExpressionBase>this._Expressions[propd._ID];
            if (expr instanceof Data.BindingExpressionBase)
                expr._TryUpdateSourceObject(value);
        }
        ClearValue(propd: DependencyProperty) {
            if (!propd)
                throw new ArgumentException("No dependency property.");
            if (propd.IsReadOnly && !propd.IsCustom)
                throw new ArgumentException("This property is readonly.");
            this._RemoveExpression(propd);

            var storage = Providers.GetStorage(this, propd);
            var anims = storage.Animations;
            if (anims && anims.length > 0)
                return;
            propd.Store.ClearValue(storage);
        }
        ReadLocalValue(propd: DependencyProperty): any {
            if (!propd)
                throw new ArgumentException("No property specified.");
            var expr = this._Expressions[propd._ID];
            var val: any;
            if (expr)
                val = expr.GetValue(propd);
            else
                val = this.ReadLocalValueInternal(propd);
            if (val === undefined)
                return DependencyProperty.UnsetValue;
            return val;
        }
        ReadLocalValueInternal(propd: DependencyProperty): any {
            var storage = Providers.GetStorage(this, propd);
            return storage.Local;
        }

        private _AddExpression(propd: DependencyProperty, expr: Expression) {
            this._Expressions[propd._ID] = expr;
            expr.OnAttached(this);
        }
        private _RemoveExpression(propd: DependencyProperty) {
            var expr = this._Expressions[propd._ID];
            if (expr) {
                this._Expressions[propd._ID] = undefined;
                expr.OnDetached(this);
            }
        }
        _HasDeferredValueExpression(propd: DependencyProperty) {
            var expr = this._Expressions[propd._ID];
            return expr instanceof DeferredValueExpression;
        }
        GetBindingExpression(propd: DependencyProperty): Data.BindingExpressionBase {
            var expr = this._Expressions[propd._ID];
            if (expr instanceof Data.BindingExpressionBase)
                return <Data.BindingExpressionBase>expr;
        }
        HasValueOrExpression(propd: DependencyProperty): boolean {
            if (this._Expressions[propd._ID] instanceof Expression)
                return true;
            return this.ReadLocalValueInternal(propd) !== undefined;
        }
        SetBinding(propd: DependencyProperty, binding: Data.Binding): Data.BindingExpressionBase {
            if (!propd)
                throw new ArgumentException("propd");
            if (!binding)
                throw new ArgumentException("binding");

            var e = new Data.BindingExpression(binding);
            this.SetValueInternal(propd, e);
            return e;
        }

        CloneCore(source: DependencyObject) {
            var sarr = source._PropertyStorage;
            var darr = this._PropertyStorage;
            if (!darr)
                darr = this._PropertyStorage = [];
            for (var id in sarr) {
                var storage: Providers.IPropertyStorage = sarr[id];
                darr[id] = storage.Property.Store.Clone(this, storage);
            }
        }

        ListenToChanged (propd: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void, closure?: any): Providers.IPropertyChangedListener {
            return propd.Store.ListenToChanged(this, propd, func, closure);
        }
    }
    Fayde.CoreLibrary.add(DependencyObject);

    DependencyObject.DataContextProperty.Store = Fayde.Providers.DataContextStore.Instance;
}