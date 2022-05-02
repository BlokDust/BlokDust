module Fayde.Controls.Internal {
    export interface IDomainOwner extends UIElement {
        Items: Internal.ObservableObjectCollection;
        InvalidInputAction: InvalidInputAction;
        FallbackItem: any;
        Value: any;
        CurrentIndex: number;
        IsEditable: boolean;
        OnValueChanged(oldValue: any, newValue: any);
        OnCurrentIndexChanged(oldIndex: number, newIndex: number);
        OnIsEditingChanged(isEditing: boolean);
        OnIsInvalidInputChanged(isInvalidInput: boolean);
        TryParseValue(text: string, ov: IOutValue): boolean;
        FormatValue(): string;
        ParseError: RoutedEvent<UpDownParseErrorEventArgs>;
    }
    export interface IDomainCoercer {
        IsEditing: boolean;
        IsInvalidInput: boolean;
        OnValueChanged(oldValue: any, newValue: any);
        OnCurrentIndexChanged(oldIndex: number, newIndex: number);
        UpdateTextBoxText();
        UpdateIsEditable();
        ProcessUserInput();
        Attach(textBox: TextBox);
        Detach();
        EscapeFocus();
    }
    export class DomainCoercer implements IDomainCoercer {
        TextBox: TextBox = null;
        Text = "";
        IsCoercing = false;

        private _IsEditing = false;
        get IsEditing (): boolean {
            return this._IsEditing;
        }

        set IsEditing (value: boolean) {
            if (value === this._IsEditing)
                return;
            this._IsEditing = value;
            this.OnIsEditingChanged(value);
        }

        private OnIsEditingChanged (isEditing: boolean) {
            this.Owner.OnIsEditingChanged(isEditing);
            if (!this.TextBox)
                return;
            if (!isEditing) {
                this.TextBox.Text = this.Owner.FormatValue();
                this.TextBox.IsHitTestVisible = false;
            } else {
                if (this.TextBox.IsFocused)
                    this.TextBox.Select(0, this.TextBox.Text.length);
                this.TextBox.IsHitTestVisible = true;
            }
        }

        private _IsInvalidInput = false;
        get IsInvalidInput (): boolean {
            return this._IsInvalidInput;
        }

        set IsInvalidInput (value: boolean) {
            if (value === this._IsInvalidInput)
                return;
            this._IsInvalidInput = value;
            this.Owner.OnIsInvalidInputChanged(value);
        }

        constructor (public Owner: IDomainOwner, public OnCoerceValue: (val: any) => void, public OnCoerceCurrentIndex: (val: number) => void) {
            this.Owner.KeyDown.on(this.OnKeyDown, this);
        }

        Attach (textBox: TextBox) {
            this.TextBox = textBox;
            if (textBox) {
                textBox.GotFocus.on(this.TextBox_GotFocus, this);
                textBox.LostFocus.on(this.TextBox_LostFocus, this);
            }
            this.UpdateTextBoxText();
            this.UpdateIsEditable();
        }

        Detach () {
            if (this.TextBox) {
                this.TextBox.GotFocus.off(this.TextBox_GotFocus, this);
                this.TextBox.LostFocus.off(this.TextBox_LostFocus, this);
            }
            this.TextBox = null;
        }

        private OnKeyDown (sender, e: Fayde.Input.KeyEventArgs) {
            if (e != null && ((e.Key === Fayde.Input.Key.Enter || e.Key === Fayde.Input.Key.Space) && !this.IsEditing && this.Owner.IsEditable)) {
                this.IsEditing = true;
                e.Handled = true;
            } else {
                if (e == null || e.Handled)
                    return;
                if (e.Key === Fayde.Input.Key.Escape) {
                    this.IsInvalidInput = false;
                    this.IsEditing = false;
                    e.Handled = true;
                } else if (!this.IsEditing && this.Owner.IsEditable)
                    this.IsEditing = true;
            }
        }

        EscapeFocus () {
            if (!this.IsInvalidInput)
                this.IsEditing = false;
            else if (this.Owner.InvalidInputAction === InvalidInputAction.TextBoxCannotLoseFocus && this.TextBox.IsFocused)
                window.setTimeout(() => this.TextBox.Focus(), 1);
        }

        OnValueChanged (oldValue: any, newValue: any) {
            if (!this.IsCoercing) {
                var index = this.Owner.Items.IndexOf(newValue);
                if (index > -1) {
                    this.IsCoercing = true;
                    this.OnCoerceCurrentIndex(index);
                    this.IsCoercing = false;
                }
            }
            this.UpdateTextBoxText();
            this.Owner.OnValueChanged(oldValue, newValue);
        }

        OnCurrentIndexChanged (oldIndex: number, newIndex: number) {
            if (!this.IsCoercing) {
                if (newIndex >= 0 && newIndex < this.Owner.Items.Count) {
                    this.IsCoercing = true;
                    this.OnCoerceValue(this.Owner.Items.GetValueAt(newIndex));
                    this.IsCoercing = false;
                }
            }
            this.IsEditing = false;
            this.Owner.OnCurrentIndexChanged(oldIndex, newIndex);
        }

        private TextBox_LostFocus (sender: any, e: RoutedEventArgs) {
            this.ProcessUserInput();
        }

        private TextBox_GotFocus (sender: any, e: RoutedEventArgs) {
            this.SelectAllText();
        }

        SelectAllText () {
            if (this.TextBox)
                this.TextBox.SelectAll();
        }

        UpdateTextBoxText () {
            if (!this.TextBox)
                return;
            this.Text = this.Owner.FormatValue() || "";
            this.TextBox.Text = this.Text;
            this.TextBox.SelectionStart = this.Text.length;
        }

        UpdateIsEditable () {
            if (this.TextBox)
                this.TextBox.IsReadOnly = !this.Owner.IsEditable;
        }

        ProcessUserInput () {
            if (!this.TextBox || this.Text === this.TextBox.Text)
                return;
            var selectionStart = this.TextBox.SelectionStart;
            this.Text = this.TextBox.Text;
            this.ApplyValue(this.Text);
            if (selectionStart < this.TextBox.Text.length)
                this.TextBox.SelectionStart = selectionStart;
        }

        OnParseError (e: UpDownParseErrorEventArgs) {
            this.Owner.ParseError.raise(this, e);
        }

        private ApplyValue (text: string) {
            if (!this.Owner.IsEditable)
                return;
            this.IsEditing = true;
            try {
                var val: IOutValue = {Value: null};
                this.IsInvalidInput = !this.Owner.TryParseValue(text, val);
                this.OnCoerceValue(val.Value);
            } catch (err) {
                var e = new UpDownParseErrorEventArgs(text, err);
                this.OnParseError(e);
                if (!e.Handled)
                    this.UpdateTextBoxText();
            } finally {
                if (!this.IsInvalidInput)
                    this.IsEditing = false;
            }
        }
    }
}