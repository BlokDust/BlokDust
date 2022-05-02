/// <reference path="Expression.ts" />

module Fayde.Data {
    export class BindingExpressionBase extends Expression implements IPropertyPathWalkerListener {
        //read-only properties
        ParentBinding: Data.Binding;
        Target: DependencyObject;
        Property: DependencyProperty;

        private PropertyPathWalker: PropertyPathWalker;
        private _PropertyListener: Providers.IPropertyChangedListener;
        private _SourceAvailableMonitor: IIsAttachedMonitor;

        private _IsDataContextBound: boolean;
        private _DataContext: any;
        private _TwoWayLostFocusElement: UIElement = null;

        private _CurrentNotifyError: Data.INotifyDataErrorInfo = null;
        private _CurrentError: Validation.ValidationError = null;

        get DataItem (): any {
            return this.PropertyPathWalker.Source;
        }

        private _Cached: boolean = false;
        private _CachedValue: any = undefined;

        constructor (binding: Data.Binding) {
            super();
            if (!Object.isFrozen(binding))
                Object.freeze(binding);
            Object.defineProperty(this, "ParentBinding", {
                value: binding,
                writable: false
            });
        }

        private _IsSealed = false;

        Seal (owner: DependencyObject, prop: any) {
            if (this._IsSealed)
                return;
            this._IsSealed = true;

            Object.defineProperty(this, "Target", {
                value: owner,
                writable: false
            });
            var propd = <DependencyProperty>prop;
            Object.defineProperty(this, "Property", {
                value: propd,
                writable: false
            });

            var binding = this.ParentBinding;
            var path = binding.Path.Path;
            if ((!path || path === ".") && binding.Mode === Data.BindingMode.TwoWay)
                throw new ArgumentException("TwoWay bindings require a non-empty Path.");

            if (binding.Mode === BindingMode.TwoWay && (owner instanceof Controls.TextBox || owner instanceof Controls.PasswordBox))
                this._TwoWayLostFocusElement = <UIElement>owner;

            this._IsDataContextBound = !binding.ElementName && !binding.Source && !binding.RelativeSource;

            var bindsToView = propd === DependencyObject.DataContextProperty || propd.GetTargetType() === <any>nullstone.IEnumerable_ || propd.GetTargetType() === <any>Data.ICollectionView_;
            var walker = this.PropertyPathWalker = new PropertyPathWalker(binding.Path.ParsePath, binding.BindsDirectlyToSource, bindsToView, this._IsDataContextBound);
            if (binding.Mode !== BindingMode.OneTime)
                walker.Listen(this);
        }

        OnAttached (element: DependencyObject) {
            if (this.IsAttached)
                return;
            if (this.Target && this.Target !== element)
                throw new Error("Cannot attach BindingExpression to another DependencyObject.");
            if (Fayde.Data.Debug && window.console)
                console.log("[BINDING] OnAttached: [" + (<any>element).constructor.name + "] {Path=" + this.ParentBinding.Path.Path + "}");

            super.OnAttached(element);

            this._SourceAvailableMonitor = this.Target.XamlNode.MonitorIsAttached((newIsAttached) => this._OnSourceAvailable());
            var source = this._FindSource();
            this.PropertyPathWalker.Update(source);

            if (this._TwoWayLostFocusElement)
                this._TwoWayLostFocusElement.LostFocus.on(this._TargetLostFocus, this);

            if (this.ParentBinding.Mode === BindingMode.TwoWay && this.Property.IsCustom) {
                this._PropertyListener = this.Property.Store.ListenToChanged(this.Target, this.Property, this._UpdateSourceCallback, this);
            }
        }

        GetValue (propd: DependencyProperty): any {
            if (this._Cached)
                return this._CachedValue;

            if (this.PropertyPathWalker.IsPathBroken) {
                var target = this.Target;
                if (Data.WarnBrokenPath && target && target.XamlNode.IsAttached) {
                    var fe: FrameworkElement = target instanceof FrameworkElement ? <FrameworkElement>target : null;
                    if (!fe || fe.XamlNode.IsLoaded)
                        console.warn("[BINDING] Path Broken --> Path='" + this.PropertyPathWalker.Path + "'");
                }
                this._CachedValue = null;
            } else {
                this._CachedValue = this.PropertyPathWalker.ValueInternal;
            }

            this._CachedValue = this._ConvertToType(propd, this._CachedValue);
            this._Cached = true;
            return this._CachedValue;
        }

        private _OnSourceAvailable () {
            this._SourceAvailableMonitor.Detach();
            var source = this._FindSource();
            if (source) this.PropertyPathWalker.Update(source);
            this._Invalidate();
            this.Target.SetValue(this.Property, this);
        }

        private _FindSource (): any {
            if (this.ParentBinding.Source) {
                return this.ParentBinding.Source;
            } else if (this.ParentBinding.ElementName != null) {
                return this._FindSourceByElementName();
            } else if (this.ParentBinding.RelativeSource) {
                return this.ParentBinding.RelativeSource.Find(this.Target);
            }
            return this._DataContext;
        }

        private _FindSourceByElementName (): XamlObject {
            var name = this.ParentBinding.ElementName;
            var xobj: XamlObject = this.Target;
            if (!xobj)
                return undefined;
            var source = xobj.FindName(name, true);
            if (source)
                return source;
            //TODO: Crawl out of ListBoxItem?
            return undefined;
        }

        OnDetached (element: DependencyObject) {
            if (!this.IsAttached)
                return;
            if (Fayde.Data.Debug && window.console)
                console.log("[BINDING] OnDetached: [" + (<any>element).constructor.name + "] {Path=" + this.ParentBinding.Path.Path + "}");

            super.OnDetached(element);

            if (this._TwoWayLostFocusElement)
                this._TwoWayLostFocusElement.LostFocus.off(this._TargetLostFocus, this);

            if (this._CurrentError != null) {
                var fe = getMentor(element);
                if (fe)
                    Validation.RemoveError(fe, this._CurrentError);
                this._CurrentError = null;
            }

            if (this._PropertyListener) {
                this._PropertyListener.Detach();
                this._PropertyListener = null;
            }

            this.PropertyPathWalker.Update(null);

            this.Target = undefined;
        }

        IsBrokenChanged () {
            this.Refresh();
        }

        ValueChanged () {
            this.Refresh();
        }

        UpdateSource () {
            return this._UpdateSourceObject();
        }

        _TryUpdateSourceObject (value: any) {
            if (this._ShouldUpdateSource())
                this._UpdateSourceObject(value);
        }

        private _UpdateSourceCallback (sender, args: IDependencyPropertyChangedEventArgs) {
            try {
                if (this._ShouldUpdateSource())
                    this._UpdateSourceObject(this.Target.GetValue(this.Property));
            } catch (err) {
                console.warn("[BINDING] UpdateSource: " + err.toString());
            }
        }

        private _TargetLostFocus (sender: any, e: nullstone.IEventArgs) {
            if (this.ParentBinding.UpdateSourceTrigger === UpdateSourceTrigger.Explicit)
                return;
            this._UpdateSourceObject();
        }

        private _ShouldUpdateSource () {
            if (this.IsUpdating)
                return false;
            if (!this._TwoWayLostFocusElement)
                return this.ParentBinding.UpdateSourceTrigger !== UpdateSourceTrigger.Explicit;
            return this.ParentBinding.UpdateSourceTrigger === UpdateSourceTrigger.PropertyChanged;
        }

        private _UpdateSourceObject (value?: any) {
            if (value === undefined)
                value = this.Target.GetValue(this.Property);
            var binding = this.ParentBinding;
            if (binding.Mode !== BindingMode.TwoWay)
                return;

            var dataError: string = null;
            var exception: Exception;
            var oldUpdating = this.IsUpdating;
            var walker = this.PropertyPathWalker;
            var node = this.PropertyPathWalker.FinalNode;

            try {
                if (this.PropertyPathWalker.IsPathBroken)
                    return;
                value = this._ConvertFromTargetToSource(binding, node, value);
                if (this._CachedValue === undefined && value === undefined)
                    return;

                this.IsUpdating = true;
                node.SetValue(value);
                this._CachedValue = value;
            } catch (err) {
                if (binding.ValidatesOnExceptions) {
                    if (err instanceof TargetInvocationException)
                        exception = err.InnerException;
                    exception = err;
                }
            } finally {
                this.IsUpdating = oldUpdating;
                if (binding.ValidatesOnDataErrors && !exception) {
                    dataError = getDataError(walker);
                }
            }

            if (binding.ValidatesOnExceptions)
                this._MaybeEmitError(null, exception);
            else if (binding.ValidatesOnDataErrors)
                this._MaybeEmitError(dataError, exception);
        }

        OnDataContextChanged (newDataContext: any) {
            if (Fayde.Data.Debug && window.console)
                console.log("[BINDING] DataContextChanged: [" + (<any>this.Target)._ID + ":" + (<any>this.Target).constructor.name + "] {Path=" + this.ParentBinding.Path.Path + "}");

            if (this._DataContext === newDataContext)
                return;
            this._DataContext = newDataContext;
            if (!this._IsDataContextBound)
                return;

            if (Fayde.Data.IsCounterEnabled)
                Fayde.Data.DataContextCounter++;
            try {
                this.PropertyPathWalker.Update(newDataContext);
                if (this.ParentBinding.Mode === BindingMode.OneTime)
                    this.Refresh();
            } catch (err) {
                console.warn("[BINDING] DataContextChanged Error: " + err.message);
            }
        }

        private _Invalidate () {
            this._Cached = false;
            this._CachedValue = undefined;
        }

        Refresh () {
            var dataError: string = null;
            var exception: Exception;

            if (!this.IsAttached)
                return;

            var walker = this.PropertyPathWalker;
            this._AttachToNotifyError(walker.FinalNode.GetSource());

            var binding = this.ParentBinding;
            if (!this.IsUpdating && binding.ValidatesOnDataErrors)
                dataError = getDataError(walker);

            var oldUpdating = this.IsUpdating;
            try {
                this.IsUpdating = true;
                this._Invalidate();
                this.Target.SetValue(this.Property, this);
            } catch (err) {
                if (binding.ValidatesOnExceptions) {
                    exception = err;
                    if (exception instanceof TargetInvocationException)
                        exception = (<TargetInvocationException>exception).InnerException;
                } else {
                    console.warn(err);
                }
            } finally {
                this.IsUpdating = oldUpdating;
            }

            if (binding.ValidatesOnExceptions)
                this._MaybeEmitError(null, exception);
            else if (binding.ValidatesOnDataErrors)
                this._MaybeEmitError(dataError, exception);
        }

        private _ConvertFromTargetToSource (binding: Data.Binding, node: IPropertyPathNode, value: any): any {
            if (binding.TargetNullValue && binding.TargetNullValue === value)
                value = null;

            var converter = binding.Converter;
            if (converter) {
                value = converter.ConvertBack(value, node.ValueType, binding.ConverterParameter, binding.ConverterCulture);
            }

            //TODO: attempt to parse string for target type
            // We don't have a target type for plain objects
            //if (value instanceof String) { }

            return value;
        }

        private _ConvertToType (propd: DependencyProperty, value: any): any {
            var targetType = this.Property.GetTargetType();
            try {
                var binding = this.ParentBinding;
                if (!this.PropertyPathWalker.IsPathBroken && binding.Converter) {
                    value = binding.Converter.Convert(value, targetType, binding.ConverterParameter, binding.ConverterCulture);
                }
                if (value === DependencyProperty.UnsetValue || this.PropertyPathWalker.IsPathBroken) {
                    value = binding.FallbackValue;
                    if (value === undefined)
                        value = propd.DefaultValue;
                } else if (value == null) {
                    value = binding.TargetNullValue;
                    if (value == null && this._IsDataContextBound && !binding.Path.Path)
                        value = propd.DefaultValue;
                } else {
                    var format = binding.StringFormat;
                    if (format) {
                        if (format.indexOf("{0") < 0)
                            format = "{0:" + format + "}";
                        value = Localization.Format(format, value);
                    }
                }
            } catch (err) {
                console.warn("[BINDING]" + err.toString());
                value = binding.FallbackValue;
            }
            return nullstone.convertAnyToType(value, <Function>targetType);
        }

        private _MaybeEmitError (message: string, exception: Exception) {
            var fe = getMentor(this.Target);
            if (!fe)
                return;

            var error = (exception instanceof Exception || exception instanceof Error) ? exception : null;
            if (message === "")
                message = null;

            var oldError = this._CurrentError;
            if (message != null)
                this._CurrentError = new Validation.ValidationError(message, null, this.PropertyPathWalker.FinalPropertyName);
            else if (error)
                this._CurrentError = new Validation.ValidationError(null, error, this.PropertyPathWalker.FinalPropertyName);
            else
                this._CurrentError = null;

            Validation.Emit(fe, this.ParentBinding, oldError, this._CurrentError);
        }

        private _AttachToNotifyError (element: Data.INotifyDataErrorInfo) {
            if (!Data.INotifyDataErrorInfo_.is(element))
                return;
            if (element === this._CurrentNotifyError || !this.ParentBinding.ValidatesOnNotifyDataErrors)
                return;

            var property = this.PropertyPathWalker.FinalPropertyName;
            if (this._CurrentNotifyError) {
                this._CurrentNotifyError.ErrorsChanged.off(this._NotifyErrorsChanged, this);
                this._MaybeEmitError(null, null);
            }

            this._CurrentNotifyError = element;

            if (element) {
                element.ErrorsChanged.on(this._NotifyErrorsChanged, this);
                if (element.HasErrors) {
                    var enu = element.GetErrors(property);
                    if (enu) {
                        for (var en = enu.getEnumerator(); en.moveNext();) {
                            this._MaybeEmitError(en.current, en.current);
                        }
                    }
                } else {
                    this._MaybeEmitError(null, null);
                }
            }
        }

        private _NotifyErrorsChanged (sender: any, e: Data.DataErrorsChangedEventArgs) {
            var property = this.PropertyPathWalker.FinalPropertyName;
            if (e.PropertyName !== property)
                return;
            var errors = this._CurrentNotifyError ? this._CurrentNotifyError.GetErrors(property) : null;
            if (!errors) {
                this._MaybeEmitError(null, null);
                return;
            }

            var arr = nullstone.IEnumerable_.toArray(errors);
            if (arr.length <= 0) {
                this._MaybeEmitError(null, null);
                return;
            }

            for (var i = 0; i < arr.length; i++) {
                var cur = arr[i];
                this._MaybeEmitError(cur, cur);
            }
        }

    }

    function getMentor (dobj: DependencyObject): FrameworkElement {
        for (var cur = <XamlObject>dobj; cur; cur = cur.Parent) {
            if (cur instanceof FrameworkElement)
                return <FrameworkElement>cur;
        }
        return null;
    }

    function getDataError (walker: PropertyPathWalker): string {
        var info = IDataErrorInfo_.as(walker.FinalNode.GetSource());
        var name = walker.FinalPropertyName;
        return (info && name) ? info.GetError(name) : null;
    }
}