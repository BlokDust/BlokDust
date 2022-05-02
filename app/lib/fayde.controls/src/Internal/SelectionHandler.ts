module Fayde.Controls.Internal {
    export class SelectionHandler {
        private _ActiveBox: TextBox = null;
        get ActiveBox(): TextBox { return this._ActiveBox; }

        private _IsMouseDown = false;

        private _TextBoxes: TextBox[] = [];
        constructor(textBoxes: TextBox[]) {
            this._TextBoxes = textBoxes = textBoxes.filter(tb => !!tb);
            textBoxes.forEach(tb => {
                tb.MouseLeftButtonDown.on(this._MouseDown, this);
                tb.MouseLeftButtonUp.on(this._MouseUp, this);
                tb.GotFocus.on(this._GotFocus, this);
                tb.LostFocus.on(this._LostFocus, this);
            });
        }
        Dispose() {
            this._TextBoxes.forEach(tb => {
                tb.MouseLeftButtonDown.off(this._MouseDown, this);
                tb.MouseLeftButtonUp.off(this._MouseUp, this);
                tb.GotFocus.off(this._GotFocus, this);
                tb.LostFocus.off(this._LostFocus, this);
            });
        }

        private _GotFocus(sender: any, e: RoutedEventArgs) {
            if (this._IsMouseDown)
                return;
            (<TextBox>sender).SelectAll();
        }
        private _MouseDown(sender: any, e: Input.MouseButtonEventArgs) {
            this._IsMouseDown = true;
        }
        private _MouseUp(sender: any, e: RoutedEventArgs) {
            this._IsMouseDown = false;
            if (this._ActiveBox === sender)
                return;
            this._ActiveBox = sender;
            if (this._ActiveBox.SelectionLength <= 0)
                (<TextBox>sender).SelectAll();
        }
        private _LostFocus(sender: any, e: RoutedEventArgs) {
            (<TextBox>sender).Select(0, 0);
            if (this._ActiveBox === sender)
                this._ActiveBox = null;
        }
    }
} 