/// <reference path="UpDownBase.ts" />

module Fayde.Controls {
    export interface IOutValue {
        Value: any;
    }

    export class DomainUpDown extends Control {
        static ValueProperty = DependencyProperty.Register("Value", () => Object, DomainUpDown, null, (d, args) => (<DomainUpDown>d)._Coercer.OnValueChanged(args.OldValue, args.NewValue));
        static IsEditableProperty = DependencyProperty.Register("IsEditable", () => Boolean, DomainUpDown, false, (d, args) => (<DomainUpDown>d)._Coercer.UpdateIsEditable());
        static SpinnerStyleProperty = DependencyProperty.Register("SpinnerStyle", () => Style, DomainUpDown);
        static CurrentIndexProperty = DependencyProperty.Register("CurrentIndex", () => Number, DomainUpDown, -1, (d, args) => (<DomainUpDown>d)._Coercer.OnCurrentIndexChanged(args.OldValue, args.NewValue));
        static IsCyclicProperty = DependencyProperty.Register("IsCyclic", () => Boolean, DomainUpDown, false, (d, args) => (<DomainUpDown>d)._OnIsCyclicChanged(args));
        static InvalidInputActionProperty = DependencyProperty.RegisterFull("InvalidInputAction", () => new Enum(InvalidInputAction), DomainUpDown, InvalidInputAction.UseFallbackItem, undefined, undefined, false, inputActionValidator, true);
        static FallbackItemProperty = DependencyProperty.Register("FallbackItem", () => Object, DomainUpDown, null);
        static ItemsSourceProperty = DependencyProperty.Register("ItemsSource", () => nullstone.IEnumerable_, DomainUpDown, undefined, (d, args) => (<DomainUpDown>d)._OnItemsSourceChanged(args.OldValue, args.NewValue));
        static ItemTemplateProperty = DependencyProperty.Register("ItemTemplate", () => DataTemplate, DomainUpDown);

        Value: any;
        IsEditable: boolean;
        SpinnerStyle: Style;
        CurrentIndex: number;
        IsCyclic: boolean;
        InvalidInputAction: InvalidInputAction;
        FallbackItem: any;
        ItemsSource: nullstone.IEnumerable<any>;
        ItemTemplate: DataTemplate;
        Items: Internal.ObservableObjectCollection;

        OnValueChanged (oldItem: any, newItem: any) {
        }

        OnCurrentIndexChanged (oldIndex: number, newIndex: number) {
            this.UpdateValidSpinDirection();
        }

        private _OnIsCyclicChanged (args: IDependencyPropertyChangedEventArgs) {
            this.UpdateValidSpinDirection();
        }

        private _OnItemsSourceChanged (oldItemsSource: nullstone.IEnumerable<any>, newItemsSource: nullstone.IEnumerable<any>) {
            var cc = Collections.INotifyCollectionChanged_.as(oldItemsSource);
            if (cc)
                cc.CollectionChanged.off(this._ItemsSourceModified, this);

            this.Items.IsReadOnly = false;
            this.Items.Clear();
            if (!newItemsSource)
                return;

            var en = nullstone.IEnumerable_.as(newItemsSource);
            var arr: any[];
            if (en) {
                var enu = en.getEnumerator();
                arr = [];
                while (enu.moveNext()) {
                    arr.push(enu.current);
                }
            } else if (newItemsSource instanceof Array) {
                arr = <any[]><any>newItemsSource;
            }
            if (arr) {
                this.Items.AddRange(arr);
                this.Items.IsReadOnly = true;
            }

            cc = Collections.INotifyCollectionChanged_.as(newItemsSource);
            if (cc)
                cc.CollectionChanged.on(this._ItemsSourceModified, this);
        }

        private _ItemsSourceModified (sender: any, e: Collections.CollectionChangedEventArgs) {
            var coll = <Collections.ObservableCollection<any>>sender;
            var index: number;
            this.Items.IsReadOnly = false;
            switch (e.Action) {
                case Collections.CollectionChangedAction.Add:
                    index = e.NewStartingIndex;
                    for (var en = nullstone.IEnumerator_.fromArray(e.NewItems); en.moveNext();) {
                        this.Items.Insert(index, en.current);
                        index++;
                    }
                    break;
                case Collections.CollectionChangedAction.Remove:
                    for (var en = nullstone.IEnumerator_.fromArray(e.OldItems); en.moveNext();) {
                        this.Items.RemoveAt(e.OldStartingIndex);
                    }
                    break;
                case Collections.CollectionChangedAction.Replace:
                    index = e.NewStartingIndex;
                    for (var en = nullstone.IEnumerator_.fromArray(e.NewItems); en.moveNext();) {
                        this.Items.SetValueAt(index, en.current);
                        index++;
                    }
                    break;
                case Collections.CollectionChangedAction.Reset:
                    this.Items.Clear();
                    this.Items.AddRange(coll.ToArray());
                    break;
            }
            this.Items.IsReadOnly = true;
        }

        private _OnItemsChanged (sender: any, e: Collections.CollectionChangedEventArgs) {
            this._Coercer.UpdateTextBoxText();
        }

        ValueChanging = new RoutedPropertyChangingEvent<number>();
        ParseError = new RoutedEvent<UpDownParseErrorEventArgs>();

        get ValueMemberPath (): string {
            var vb = this.ValueMemberBinding;
            return vb ? vb.Path.Path : null;
        }

        set ValueMemberPath (value: string) {
            var vb = this.ValueMemberBinding;
            if (!value) {
                if (!vb)
                    return;
                var binding1 = new Fayde.Data.Binding();
                binding1.Converter = vb.Converter;
                binding1.ConverterCulture = vb.ConverterCulture;
                binding1.ConverterParameter = vb.ConverterParameter;
                this.ValueMemberBinding = binding1;
            } else if (vb != null) {
                var binding1 = new Fayde.Data.Binding(value);
                binding1.Converter = vb.Converter;
                binding1.ConverterCulture = vb.ConverterCulture;
                binding1.ConverterParameter = vb.ConverterParameter;
                this.ValueMemberBinding = binding1;
            } else
                this.ValueMemberBinding = new Fayde.Data.Binding(value);
        }

        private _ValueBindingEvaluator: Internal.BindingSourceEvaluator<string> = null;

        get ValueMemberBinding (): Fayde.Data.Binding {
            var vbe = this._ValueBindingEvaluator;
            return vbe ? vbe.ValueBinding : null;
        }

        set ValueMemberBinding (value: Fayde.Data.Binding) {
            this._ValueBindingEvaluator = new Internal.BindingSourceEvaluator<string>(value);
        }

        private _Coercer: Internal.IDomainCoercer;
        private _SpinFlow: Internal.ISpinFlow;
        private _CanEditByFocus = false;

        constructor () {
            super();
            this.DefaultStyleKey = DomainUpDown;

            Object.defineProperty(this, "Items", {value: new Internal.ObservableObjectCollection(), writable: false});
            this.Items.CollectionChanged.on(this._OnItemsChanged, this);

            this._Coercer = new Internal.DomainCoercer(this,
                    val => this.SetCurrentValue(DomainUpDown.ValueProperty, val),
                    val => this.SetCurrentValue(DomainUpDown.CurrentIndexProperty, val));
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();

            if (this._SpinFlow)
                this._SpinFlow.Dispose();
            this._SpinFlow = new Internal.SpinFlow(this, <Spinner>this.GetTemplateChild("Spinner", Spinner));

            this._Coercer.Detach();
            this._Coercer.Attach(<TextBox>this.GetTemplateChild("Text", TextBox));

            this.UpdateValidSpinDirection();
            this.UpdateVisualState();
        }

        OnGotFocus (e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.UpdateVisualState();
            if (this.IsEnabled)
                this.TryEnterEditMode();
        }

        OnLostFocus (e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.UpdateVisualState();
            if (this.IsEnabled)
                this._Coercer.EscapeFocus();
        }

        OnMouseEnter (e: Fayde.Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this.UpdateVisualState();
        }

        OnMouseLeave (e: Fayde.Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            this.UpdateVisualState();
        }

        OnMouseLeftButtonDown (e: Fayde.Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            this.UpdateVisualState();
        }

        OnMouseLeftButtonUp (e: Fayde.Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonUp(e);
            this.UpdateVisualState();
            if (this.IsEnabled && !this._Coercer.IsEditing) {
                this.Focus();
                this.TryEnterEditMode();
            }
        }

        GoToStates (gotoFunc: (state: string) => boolean) {
            super.GoToStates(gotoFunc);
            this.GoToStateEditing(gotoFunc);
            this.GoToStateValid(gotoFunc);
        }

        GoToStateEditing (gotoFunc: (state: string) => boolean): boolean {
            return gotoFunc(this._Coercer.IsEditing ? "Edit" : "Display");
        }

        GoToStateValid (gotoFunc: (state: string) => boolean): boolean {
            return gotoFunc(this._Coercer.IsInvalidInput ? "InvalidDomain" : "ValidDomain");
        }

        private UpdateValidSpinDirection () {
            if (!this._SpinFlow)
                return;
            var isCyclic = this.IsCyclic;
            var curIndex = this.CurrentIndex;
            this._SpinFlow.UpdateValid(isCyclic || curIndex > 0, isCyclic || curIndex < this.Items.Count - 1);
        }

        private TryEnterEditMode () {
            if (this._Coercer.IsEditing)
                return;
            if (!this._CanEditByFocus && this.IsEditable)
                this._Coercer.IsEditing = true;
        }

        OnIsEditingChanged (isEditing: boolean) {
            this.UpdateVisualState();
        }

        OnIsInvalidInputChanged (isInvalid: boolean) {
            this.UpdateVisualState();
        }

        OnSpin () {
            this._Coercer.ProcessUserInput();
        }

        OnIncrement () {
            if (this.CurrentIndex < this.Items.Count - 1)
                this.CurrentIndex++;
            else if (this.IsCyclic)
                this.CurrentIndex = 0;
            this._Coercer.IsInvalidInput = false;
            this._CanEditByFocus = true;
            this.Focus();
            window.setTimeout(() => this._CanEditByFocus = false, 1);
        }

        OnDecrement () {
            if (this.CurrentIndex > 0)
                this.CurrentIndex--;
            else if (this.IsCyclic)
                this.CurrentIndex = this.Items.Count - 1;
            this._Coercer.IsInvalidInput = false;
            this._CanEditByFocus = true;
            this.Focus();
            window.setTimeout(() => this._CanEditByFocus = false, 1);
        }

        TryParseValue (text: string, ov: IOutValue): boolean {
            if (!text) {
                ov.Value = this.Value;
                return true;
            }
            var vb = this._ValueBindingEvaluator;
            var enu = this.Items.getEnumerator();
            while (enu.moveNext() && ov.Value == null) {
                ov.Value = matchItem(vb, enu.current, text);
            }
            if (ov.Value != null)
                return true;

            ov.Value = this.Value;
            if (this.InvalidInputAction === InvalidInputAction.TextBoxCannotLoseFocus)
                return false;

            if (this.InvalidInputAction === InvalidInputAction.UseFallbackItem) {
                ov.Value = this.FallbackItem;
                if (ov.Value == null || !this.Items.Contains(ov.Value))
                    throw new ArgumentException("Cannot parse value.");
            }
            return true;
        }

        FormatValue (): string {
            var val = this.Value;
            if (!val)
                return "";
            if (!this.Items.Contains(val))
                return "";
            try {
                var vb = this._ValueBindingEvaluator;
                if (vb)
                    val = vb.GetDynamicValue(val);
            } catch (err) {
            }
            if (typeof val === "string")
                return val;
            return "";
        }
    }
    TemplateVisualStates(DomainUpDown,
        {GroupName: "CommonStates", Name: "Normal"},
        {GroupName: "CommonStates", Name: "MouseOver"},
        {GroupName: "CommonStates", Name: "Pressed"},
        {GroupName: "CommonStates", Name: "Disabled"},
        {GroupName: "FocusStates", Name: "Unfocused"},
        {GroupName: "FocusStates", Name: "Focused"},
        {GroupName: "ValidationStates", Name: "Valid"},
        {GroupName: "ValidationStates", Name: "InvalidUnfocused"},
        {GroupName: "ValidationStates", Name: "InvalidFocused"},
        {GroupName: "DomainStates", Name: "ValidDomain"},
        {GroupName: "DomainStates", Name: "InvalidDomain"});


    function inputActionValidator (d: DependencyObject, propd: DependencyProperty, value: any): boolean {
        switch (value) {
            case InvalidInputAction.UseFallbackItem:
            case InvalidInputAction.TextBoxCannotLoseFocus:
                return true;
            default:
                return false;
        }
    }

    function matchItem (evaluator: Internal.BindingSourceEvaluator<string>, item: any, text: string): boolean {
        if (!evaluator)
            return text === item.toString();
        return text === (evaluator.GetDynamicValue(item) || "");
    }
}