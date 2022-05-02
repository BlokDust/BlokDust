/// <reference path="Spinner.ts" />

module Fayde.Controls {
    export class UpDownBase<T> extends Control {
        private _IgnoreValueChange: boolean = false;
        _TextBox: TextBox = null;
        _Spinner: Spinner = null;
        private _Text: string = "";

        static SpinnerStyleProperty = DependencyProperty.Register("SpinnerStyle", () => Style, UpDownBase, undefined, <T>(d: UpDownBase<T>, args) => d.OnSpinnerStyleChanged(args.OldValue, args.NewValue));
        SpinnerStyle: Style;
        private OnSpinnerStyleChanged(oldStyle: Style, newStyle: Style) { }

        Value: T;
        _OnValueChanged(args: IDependencyPropertyChangedEventArgs) {
            if (this._IgnoreValueChange)
                return;
            var oldValue: T = args.OldValue;
            var newValue: T = args.NewValue;
            var e1 = new RoutedPropertyChangingEventArgs<T>(args.Property, oldValue, newValue, true);
            this.OnValueChanging(e1);
            if (e1.InCoercion)
                return;
            if (!e1.Cancel) {
                var newValue2: T = e1.NewValue;
                var e2 = new RoutedPropertyChangedEventArgs<T>(oldValue, newValue2);
                this.OnValueChanged(e2);
            } else {
                this._IgnoreValueChange = true;
                this.Value = oldValue;
                this._IgnoreValueChange = false;
            }
        }
        OnValueChanging(e: RoutedPropertyChangingEventArgs<T>) {
            this.ValueChanging.raise(this, e);
        }
        OnValueChanged(e: RoutedPropertyChangedEventArgs<T>) {
            (<RoutedEvent<RoutedPropertyChangedEventArgs<T>>>this.ValueChanged).raise(this, e); //WTF: compiler choking without cast for some odd reason
            this.SetTextBoxText();
        }

        static IsEditableProperty = DependencyProperty.Register("IsEditable", () => Boolean, UpDownBase, true, <T>(d: UpDownBase<T>, args) => d.OnIsEditableChanged(args));
        IsEditable: boolean;
        private OnIsEditableChanged(args: IDependencyPropertyChangedEventArgs) {
            if (!this._TextBox)
                this._TextBox.IsReadOnly = !this.IsEditable;
        }

        ValueChanging = new RoutedPropertyChangingEvent<T>();
        ValueChanged = new RoutedPropertyChangedEvent<T>();
        Parsing = new RoutedEvent<UpDownParsingEventArgs<T>>();
        ParseError = new RoutedEvent<UpDownParseErrorEventArgs>();

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.SetTextBox(this.GetTemplateChild("Text"));
            this.SetSpinner(this.GetTemplateChild("Spinner"));
            this.SetTextBoxText();
            if (this._TextBox != null)
                this._TextBox.IsReadOnly = !this.IsEditable;
            this.UpdateVisualState(false);
        }
        private SetTextBox(d: DependencyObject) {
            if (this._TextBox) {
                this._TextBox.GotFocus.off(this.TextBox_GotFocus, this);
                this._TextBox.LostFocus.off(this.TextBox_LostFocus, this);
            }
            if (d instanceof TextBox)
                this._TextBox = <TextBox>d;
            else
                this._TextBox = null;
            this._TextBox.GotFocus.on(this.TextBox_GotFocus, this);
            this._TextBox.LostFocus.on(this.TextBox_LostFocus, this);
            this._Text = this._TextBox.Text;
        }
        private SetSpinner(d: DependencyObject) {
            if (this._Spinner)
                this._Spinner.Spin.off(this.Spinner_Spin, this);
            if (d instanceof Spinner)
                this._Spinner = <Spinner>d;
            else
                this._Spinner = null;
            if (this._Spinner)
                this._Spinner.Spin.on(this.Spinner_Spin, this);
        }

        OnKeyDown(e: Fayde.Input.KeyEventArgs) {
            super.OnKeyDown(e);
            if (e.Handled)
                return;
            switch (e.Key) {
                case Fayde.Input.Key.Enter:
                    this.ProcessUserInput();
                    e.Handled = true;
                    break;
                case Fayde.Input.Key.Up:
                    this.DoIncrement();
                    e.Handled = true;
                    break;
                case Fayde.Input.Key.Down:
                    this.DoDecrement();
                    e.Handled = true;
                    break;
            }
        }
        OnMouseWheel(e: Fayde.Input.MouseWheelEventArgs) {
            super.OnMouseWheel(e);
            if (e.Handled)
                return;
            if (e.Delta < 0)
                this.DoDecrement();
            else if (0 < e.Delta)
                this.DoIncrement();
            e.Handled = true;
        }

        ApplyValue(text: string) {
            var e1 = new UpDownParsingEventArgs<T>(text);
            var obj1: any;
            var error: Error = null;
            try {
                obj1 = this.ParseValue(text);
                e1.Value = obj1;
            } catch (err) {
                error = err;
            }
            try {
                this.OnParsing(e1);
            } catch (err) {
            }
            if (error == null) {
                var obj2 = e1.Handled ? e1.Value : obj1;
                var value = this.Value;
                if (this.Value === obj2)
                    this.SetTextBoxText();
                this.Value = obj2;
            } else if (e1.Handled) {
                if (this.Value === e1.Value)
                    this.SetTextBoxText();
                this.Value = e1.Value;
            } else {
                var e2 = new UpDownParseErrorEventArgs(text, error);
                this.OnParseError(e2);
                if (!e2.Handled)
                    this.SetTextBoxText();
            }
        }
        OnParseError(e: UpDownParseErrorEventArgs) {
            this.ParseError.raise(this, e);
        }
        OnParsing(e: UpDownParsingEventArgs<T>) {
            this.Parsing.raise(this, e);
        }
        ParseValue(text: string): T { return; }
        FormatValue(): string { return ""; }

        SelectAllText() {
            if (this._TextBox)
                this._TextBox.SelectAll();
        }
        SetTextBoxText() {
            if (!this._TextBox)
                return;
            this._Text = this.FormatValue() || "";
            this._TextBox.Text = this._Text;
            this._TextBox.SelectionStart = this._Text.length;
        }
        private TextBox_LostFocus(sender: any, e: RoutedEventArgs) {
            this.ProcessUserInput();
        }
        private TextBox_GotFocus(sender: any, e: RoutedEventArgs) {
            this.SelectAllText();
        }

        private Spinner_Spin(sender: any, e: SpinEventArgs) {
            if (this._TextBox)
                this.ProcessUserInput();
            this.OnSpin(e);
        }
        OnSpin(e: SpinEventArgs) {
            if (e.Direction === SpinDirection.Increase)
                this.DoIncrement();
            else
                this.DoDecrement();
        }

        private ProcessUserInput() {
            if (!this._TextBox || this._Text === this._TextBox.Text)
                return;
            var selectionStart = this._TextBox.SelectionStart;
            this._Text = this._TextBox.Text;
            this.ApplyValue(this._Text);
            if (selectionStart < this._TextBox.Text.length)
                this._TextBox.SelectionStart = selectionStart;
        }
        private DoDecrement() {
            if (this._Spinner && (this._Spinner.ValidSpinDirection & ValidSpinDirections.Decrease) !== ValidSpinDirections.Decrease)
                return;
            this.OnDecrement();
        }
        OnDecrement() { }
        private DoIncrement() {
            if (this._Spinner && (this._Spinner.ValidSpinDirection & ValidSpinDirections.Increase) !== ValidSpinDirections.Increase)
                return;
            this.OnIncrement();
        }
        OnIncrement() { }
    }
    TemplateVisualStates(UpDownBase,
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Pressed" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" });
    TemplateParts(UpDownBase,
        { Name: "Text", Type: TextBox },
        { Name: "Spinner", Type: Spinner });
}