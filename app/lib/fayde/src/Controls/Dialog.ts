/// <reference path="ContentControl" />

module Fayde.Controls {
    function clickResultPropertyChanged (dobj: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
        var btn = (dobj instanceof Primitives.ButtonBase) ? <Primitives.ButtonBase>dobj : null;
        if (!btn)
            return;
        if (args.OldValue !== undefined)
            btn.Click.off(buttonClicked, btn);
        if (args.NewValue !== undefined)
            btn.Click.on(buttonClicked, btn);
    }

    function buttonClicked (sender: Primitives.ButtonBase, args) {
        var dialog = VisualTreeHelper.GetParentOfType<Dialog>(sender, Dialog);
        if (dialog)
            dialog.DialogResult = Dialog.GetClickResult(sender);
    }

    export class Dialog extends ContentControl {
        static DialogResultProperty = DependencyProperty.Register("DialogResult", () => Boolean, Dialog, undefined, (d: Dialog, args) => d.OnDialogResultChanged(args));
        static ClickResultProperty = DependencyProperty.RegisterAttached("ClickResult", () => Boolean, Dialog, undefined, clickResultPropertyChanged);
        DialogResult: boolean;

        private _IgnoreResult = false;

        private OnDialogResultChanged (args: IDependencyPropertyChangedEventArgs) {
            if (this._IgnoreResult === true)
                return;
            var overlay = Primitives.Overlay.FindOverlay(this);
            if (overlay) {
                overlay.Close(args.NewValue);
                this._IgnoreResult = true;
                try {
                    this.SetCurrentValue(Dialog.DialogResultProperty, undefined);
                } finally {
                    this._IgnoreResult = false;
                }
            }
        }

        static GetClickResult (dobj: DependencyObject): boolean {
            return dobj.GetValue(Dialog.ClickResultProperty);
        }

        static SetClickResult (dobj: DependencyObject, value: boolean) {
            dobj.SetValue(Dialog.ClickResultProperty, value);
        }

        constructor () {
            super();
            this.DefaultStyleKey = Dialog;
        }
    }
    Fayde.CoreLibrary.add(Dialog);
}