module Fayde.Data {
    export interface IPropertyPathWalkerListener {
        IsBrokenChanged();
        ValueChanged();
    }

    export interface IPropertyPathNode {
        Next: IPropertyPathNode;
        Value: any;
        IsBroken: boolean;
        ValueType: IType;
        GetSource(): any;
        SetSource(source: any);
        SetValue(value: any);
        Listen(listener: IPropertyPathNodeListener);
        Unlisten(listener: IPropertyPathNodeListener);
    }
    export interface ICollectionViewNode extends IPropertyPathNode {
        BindToView: boolean;
    }
    export interface IPropertyPathNodeListener {
        IsBrokenChanged(node: IPropertyPathNode);
        ValueChanged(node: IPropertyPathNode);
    }

    export class PropertyPathWalker implements IPropertyPathNodeListener {
        Path: string;
        IsDataContextBound: boolean;
        Source: any;
        ValueInternal: any;
        Node: IPropertyPathNode;
        FinalNode: IPropertyPathNode;
        private _Listener: IPropertyPathWalkerListener;

        get IsPathBroken (): boolean {
            var path = this.Path;
            if (this.IsDataContextBound && (!path || path.length < 1))
                return false;

            var node = this.Node;
            while (node) {
                if (node.IsBroken)
                    return true;
                node = node.Next;
            }
            return false;
        }

        get FinalPropertyName (): string {
            var final = <StandardPropertyPathNode>this.FinalNode;
            if (final instanceof StandardPropertyPathNode)
                return final.PropertyInfo ? final.PropertyInfo.name : "";
            var lastName = "";
            for (var cur = this.Node; cur; cur = cur.Next) {
                if (cur instanceof StandardPropertyPathNode)
                    lastName = (<StandardPropertyPathNode>cur).PropertyInfo ? (<StandardPropertyPathNode>cur).PropertyInfo.name : "";
            }
            return lastName;
        }

        constructor (path: string, bindDirectlyToSource?: boolean, bindsToView?: boolean, isDataContextBound?: boolean) {
            bindDirectlyToSource = bindDirectlyToSource !== false;
            bindsToView = bindsToView === true;
            this.IsDataContextBound = isDataContextBound === true;

            this.Path = path;
            this.IsDataContextBound = isDataContextBound;

            var lastCVNode: ICollectionViewNode = null;

            if (!path || path === ".") {
                lastCVNode = new CollectionViewNode(bindDirectlyToSource, bindsToView);
                this.Node = lastCVNode;
                this.FinalNode = lastCVNode;
            } else {
                var data: IPropertyPathParserData = {
                    typeName: undefined,
                    propertyName: undefined,
                    index: undefined
                };
                var type: PropertyNodeType;
                var parser = new PropertyPathParser(path);
                while ((type = parser.Step(data)) !== PropertyNodeType.None) {
                    var isViewProperty = false;
                    //boolean isViewProperty = CollectionViewProperties.Any (prop => prop.Name == propertyName);
                    //          static readonly PropertyInfo[] CollectionViewProperties = typeof (ICollectionView).GetProperties ();
                    var node = lastCVNode = new CollectionViewNode(bindDirectlyToSource, isViewProperty);
                    switch (type) {
                        case PropertyNodeType.AttachedProperty:
                        case PropertyNodeType.Property:
                            node.Next = new StandardPropertyPathNode(data.typeName, data.propertyName);
                            break;
                        case PropertyNodeType.Indexed:
                            node.Next = new IndexedPropertyPathNode(data.index);
                            break;
                        default:
                            break;
                    }

                    if (this.FinalNode)
                        this.FinalNode.Next = node;
                    else
                        this.Node = node;
                    this.FinalNode = node.Next;
                }
            }

            lastCVNode.BindToView = lastCVNode.BindToView || bindsToView;

            this.FinalNode.Listen(this);
        }

        GetValue (item: any) {
            this.Update(item);
            var o = this.FinalNode.Value;
            return o;
        }

        Update (source: any) {
            this.Source = source;
            this.Node.SetSource(source);
        }

        Listen (listener: IPropertyPathWalkerListener) {
            this._Listener = listener;
        }

        Unlisten (listener: IPropertyPathWalkerListener) {
            if (this._Listener === listener) this._Listener = null;
        }

        IsBrokenChanged (node: IPropertyPathNode) {
            this.ValueInternal = node.Value;
            var listener = this._Listener;
            if (listener) listener.IsBrokenChanged();
        }

        ValueChanged (node: IPropertyPathNode) {
            this.ValueInternal = node.Value;
            var listener = this._Listener;
            if (listener) listener.ValueChanged();
        }

        GetContext (): any {
            var context: IPropertyPathNode = null;
            var cur = this.Node;
            var final = this.FinalNode;
            while (cur && cur !== final) {
                context = cur;
                cur = cur.Next;
            }
            if (!context) return undefined;
            return context.Value;
        }
    }

    class PropertyPathNode implements IPropertyPathNode {
        Next: IPropertyPathNode;
        _IsBroken: boolean;
        _Source: any;
        private _Value: any;
        DependencyProperty: DependencyProperty;
        PropertyInfo: any;
        private _NodeListener: IPropertyPathNodeListener;
        ValueType: IType;

        get IsBroken (): boolean {
            return this._IsBroken;
        }

        get Source (): any {
            return this._Source;
        }

        get Value (): any {
            return this._Value;
        }

        Listen (listener: IPropertyPathNodeListener) {
            this._NodeListener = listener;
        }

        Unlisten (listener: IPropertyPathNodeListener) {
            if (this._NodeListener === listener) this._NodeListener = null;
        }

        OnSourceChanged (oldSource, newSource) {
        }

        OnSourcePropertyChanged (o, e) {
        }

        UpdateValue () {
            throw new Exception("No override for abstract method: PropertyPathNode.UpdateValue");
        }

        SetValue (value: any) {
            throw new Exception("No override for abstract method: PropertyPathNode.SetValue");
        }

        GetSource (): any {
            return this._Source;
        }

        SetSource (value: any) {
            if (value == null || value !== this._Source) {
                var oldSource = this._Source;
                var npc = INotifyPropertyChanged_.as(oldSource);
                if (npc)
                    npc.PropertyChanged.off(this.OnSourcePropertyChanged, this);
                this._Source = value;
                npc = INotifyPropertyChanged_.as(this._Source);
                if (npc)
                    npc.PropertyChanged.on(this.OnSourcePropertyChanged, this);

                this.OnSourceChanged(oldSource, this._Source);
                this.UpdateValue();
                if (this.Next)
                    this.Next.SetSource(this._Value);
            }
        }

        UpdateValueAndIsBroken (newValue: any, isBroken: boolean) {
            var emitBrokenChanged = this._IsBroken !== isBroken;
            var emitValueChanged = !nullstone.equals(this.Value, newValue);

            this._IsBroken = isBroken;
            this._Value = newValue;

            if (emitValueChanged) {
                var listener = this._NodeListener;
                if (listener) listener.ValueChanged(this);
            } else if (emitBrokenChanged) {
                var listener = this._NodeListener;
                if (listener) listener.IsBrokenChanged(this);
            }
        }

        _CheckIsBroken (): boolean {
            return !this.Source || (!this.PropertyInfo && !this.DependencyProperty);
        }
    }

    class StandardPropertyPathNode extends PropertyPathNode {
        private _STypeName: string;
        private _PropertyName: string;
        PropertyInfo: nullstone.IPropertyInfo;
        private _DPListener: Providers.IPropertyChangedListener;

        constructor (typeName: string, propertyName: string) {
            super();
            this._STypeName = typeName;
            this._PropertyName = propertyName;
        }

        SetValue (value: any) {
            if (this.DependencyProperty)
                (<DependencyObject>this.Source).SetValue(this.DependencyProperty, value);
            else if (this.PropertyInfo)
                this.PropertyInfo.setValue(this.Source, value);
        }

        UpdateValue () {
            if (this.DependencyProperty) {
                this.ValueType = this.DependencyProperty.GetTargetType();
                this.UpdateValueAndIsBroken((<DependencyObject>this.Source).GetValue(this.DependencyProperty), this._CheckIsBroken());
            } else if (this.PropertyInfo) {
                //TODO: this.ValueType = PropertyInfo.PropertyType;
                this.ValueType = null;
                try {
                    this.UpdateValueAndIsBroken(this.PropertyInfo.getValue(this.Source), this._CheckIsBroken());
                } catch (err) {
                    this.UpdateValueAndIsBroken(null, this._CheckIsBroken());
                }
            } else {
                this.ValueType = null;
                this.UpdateValueAndIsBroken(null, this._CheckIsBroken());
            }
        }

        OnSourceChanged (oldSource: any, newSource: any) {
            super.OnSourceChanged(oldSource, newSource);

            var oldDO: DependencyObject;
            var newDO: DependencyObject;
            if (oldSource instanceof DependencyObject) oldDO = <DependencyObject>oldSource;
            if (newSource instanceof DependencyObject) newDO = <DependencyObject>newSource;

            var listener = this._DPListener;
            if (listener) {
                listener.Detach();
                this._DPListener = listener = null;
            }

            this.DependencyProperty = null;
            this.PropertyInfo = null;
            if (!this.Source)
                return;

            var type = this.Source.constructor;
            var typeName = this._STypeName;
            if (typeName) {
                if (typeName.indexOf(":") > -1)
                    console.warn("[Not supported] Cannot resolve type name outside of default namespace.", typeName);
                var oresolve = { type: undefined, isPrimitive: false };
                if (CoreLibrary.resolveType(null, typeName, oresolve))
                    type = oresolve.type;
            }

            if (newDO) {
                var propd = DependencyProperty.GetDependencyProperty(type, this._PropertyName, true);
                if (propd) {
                    this.DependencyProperty = propd;
                    this._DPListener = listener = propd.Store.ListenToChanged(newDO, propd, this.OnPropertyChanged, this);
                }
            }

            if (!this.DependencyProperty || !this.DependencyProperty.IsAttached) {
                this.PropertyInfo = nullstone.PropertyInfo.find(this.Source, this._PropertyName);
            }
        }

        OnPropertyChanged (sender, args: IDependencyPropertyChangedEventArgs) {
            try {
                this.UpdateValue();
                if (this.Next)
                    this.Next.SetSource(this.Value);
            } catch (err) {
                //Ignore
            }
        }

        OnSourcePropertyChanged (sender, e) {
            if (e.PropertyName === this._PropertyName && this.PropertyInfo) {
                this.UpdateValue();
                var next = this.Next;
                if (next)
                    next.SetSource(this.Value);
            }
        }
    }
    class CollectionViewNode extends PropertyPathNode implements ICollectionViewNode {
        BindsDirectlyToSource: boolean;
        BindToView: boolean;
        private _ViewPropertyListener: Providers.IPropertyChangedListener;
        private _View: ICollectionView;

        constructor (bindsDirectlyToSource: boolean, bindToView: boolean) {
            super();
            this.BindsDirectlyToSource = bindsDirectlyToSource === true;
            this.BindToView = bindToView === true;
        }

        OnSourceChanged (oldSource: any, newSource: any) {
            super.OnSourceChanged(oldSource, newSource);
            this.DisconnectViewHandlers();
            this.ConnectViewHandlers(newSource, newSource);
        }

        ViewChanged (sender: any, e: IDependencyPropertyChangedEventArgs) {
            this.DisconnectViewHandlers(true);
            this.ConnectViewHandlers(null, e.NewValue);
            this.ViewCurrentChanged(this, null);
        }

        ViewCurrentChanged (sender: any, e: nullstone.IEventArgs) {
            this.UpdateValue();
            if (this.Next)
                this.Next.SetSource(this.Value);
        }

        SetValue () {
            throw new NotSupportedException("SetValue");
        }

        UpdateValue () {
            var src = this.Source;
            if (!this.BindsDirectlyToSource) {
                var view: ICollectionView;
                if (src instanceof CollectionViewSource)
                    src = view = src.View;
                else
                    view = ICollectionView_.as(src);
                if (view && !this.BindToView)
                    src = view.CurrentItem;
            }
            this.ValueType = src == null ? null : src.constructor;
            this.UpdateValueAndIsBroken(src, this._CheckIsBroken());
        }

        _CheckIsBroken (): boolean {
            return this.Source == null;
        }

        ConnectViewHandlers (source: CollectionViewSource, view: ICollectionView) {
            if (source instanceof CollectionViewSource) {
                this._ViewPropertyListener = CollectionViewSource.ViewProperty.Store.ListenToChanged(source, CollectionViewSource.ViewProperty, this.ViewChanged, this);
                view = source.View;
            }
            this._View = ICollectionView_.as(view);
            if (this._View)
                this._View.CurrentChanged.on(this.ViewCurrentChanged, this);
        }

        DisconnectViewHandlers (onlyView?: boolean) {
            if (!onlyView)
                onlyView = false;
            if (this._ViewPropertyListener && !onlyView) {
                this._ViewPropertyListener.Detach();
                this._ViewPropertyListener = null;
            }
            if (this._View) {
                this._View.CurrentChanged.off(this.ViewCurrentChanged, this);
            }
        }
    }
    class IndexedPropertyPathNode extends PropertyPathNode {
        Index: number;
        _Source: any;
        _IsBroken: boolean;
        PropertyInfo: nullstone.IndexedPropertyInfo;

        constructor (index: any) {
            super();
            this._IsBroken = false;
            var val = parseInt(index, 10);
            if (!isNaN(val))
                index = val;
            Object.defineProperty(this, "Index", {value: index, writable: false});
        }

        UpdateValue () {
            if (this.PropertyInfo == null) {
                this._IsBroken = true;
                this.ValueType = null;
                this.UpdateValueAndIsBroken(null, this._IsBroken);
                return;
            }

            try {
                var newVal = this.PropertyInfo.getValue(this.Source, this.Index);
                this._IsBroken = false;
                this.ValueType = this.PropertyInfo.propertyType;
                this.UpdateValueAndIsBroken(newVal, this._IsBroken);
            } catch (err) {
                this._IsBroken = true;
                this.ValueType = null;
                this.UpdateValueAndIsBroken(null, this._IsBroken);
            }
        }

        SetValue (value: any) {
            if (this.PropertyInfo)
                this.PropertyInfo.setValue(this.Source, this.Index, value);
        }

        _CheckIsBroken (): boolean {
            return this._IsBroken || super._CheckIsBroken();
        }

        OnSourcePropertyChanged (o, e) {
            this.UpdateValue();
            if (this.Next != null)
                this.Next.SetSource(this.Value);
        }

        OnSourceChanged (oldSource: any, newSource: any) {
            super.OnSourceChanged(oldSource, newSource);

            var cc = Collections.INotifyCollectionChanged_.as(oldSource);
            if (cc)
                cc.CollectionChanged.off(this.CollectionChanged, this);

            cc = Collections.INotifyCollectionChanged_.as(newSource);
            if (cc)
                cc.CollectionChanged.on(this.CollectionChanged, this);

            this._GetIndexer();
        }

        private _GetIndexer () {
            this.PropertyInfo = null;
            if (this._Source != null) {
                this.PropertyInfo = nullstone.IndexedPropertyInfo.find(this._Source);
            }
        }

        CollectionChanged (o, e) {
            this.UpdateValue();
            if (this.Next)
                this.Next.SetSource(this.Value);
        }
    }
}