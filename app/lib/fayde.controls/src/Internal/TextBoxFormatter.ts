module Fayde.Controls.Internal {
    export interface IFormattedControl<T> {
        Value: T;
        IsEditable: boolean;
        ParseValue(text: string): T;
        FormatValue(val: T): string;
        Parsing: RoutedEvent<UpDownParsingEventArgs<T>>;
        ParseError: RoutedEvent<UpDownParseErrorEventArgs>;
    }
    export interface ITextBoxFormatter {
        ProcessUserInput();
        Dispose();
        UpdateTextBoxText();
        UpdateIsEditable();
    }
    export class TextBoxFormatter<T> implements ITextBoxFormatter {
        get Value(): T { return this.Control.Value; }
        Text = "";

        constructor(public Control: IFormattedControl<T>, public TextBox: TextBox, public OnCoerceValue: (val: any) => void) {
            if (this.TextBox) {
                this.TextBox.GotFocus.on(this.TextBox_GotFocus, this);
                this.TextBox.LostFocus.on(this.TextBox_LostFocus, this);
            }
            this.UpdateTextBoxText();
            this.UpdateIsEditable();
        }
        
        ProcessUserInput() {
            if (!this.TextBox || this.Text === this.TextBox.Text)
                return;
            var selectionStart = this.TextBox.SelectionStart;
            this.Text = this.TextBox.Text;
            this.ApplyValue(this.Text);
            if (selectionStart < this.TextBox.Text.length)
                this.TextBox.SelectionStart = selectionStart;
        }
        Dispose() {
            if (this.TextBox) {
                this.TextBox.GotFocus.off(this.TextBox_GotFocus, this);
                this.TextBox.LostFocus.off(this.TextBox_LostFocus, this);
            }
        }
        
        private TextBox_LostFocus(sender: any, e: RoutedEventArgs) {
            this.ProcessUserInput();
        }
        private TextBox_GotFocus(sender: any, e: RoutedEventArgs) {
            this.SelectAllText();
        }

        ApplyValue(text: string) {
            var e1 = new UpDownParsingEventArgs<T>(text);
            var obj1: T;
            var error: Error = null;
            try {
                obj1 = this.Control.ParseValue(text);
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
                    this.UpdateTextBoxText();
                this.OnCoerceValue(obj2);
            } else if (e1.Handled) {
                if (this.Value === e1.Value)
                    this.UpdateTextBoxText();
                this.OnCoerceValue(e1.Value);
            } else {
                var e2 = new UpDownParseErrorEventArgs(text, error);
                this.OnParseError(e2);
                if (!e2.Handled)
                    this.UpdateTextBoxText();
            }
        }
        OnParseError(e: UpDownParseErrorEventArgs) {
            this.Control.ParseError.raise(this, e);
        }
        OnParsing(e: UpDownParsingEventArgs<T>) {
            this.Control.Parsing.raise(this, e);
        }
        SelectAllText() {
            if (this.TextBox)
                this.TextBox.SelectAll();
        }
        UpdateTextBoxText() {
            if (!this.TextBox)
                return;
            this.Text = this.Control.FormatValue(this.Value) || "";
            this.TextBox.Text = this.Text;
            this.TextBox.SelectionStart = this.Text.length;
        }
        UpdateIsEditable() {
            if (this.TextBox)
                this.TextBox.IsReadOnly = !this.Control.IsEditable;
        }
    }
} 