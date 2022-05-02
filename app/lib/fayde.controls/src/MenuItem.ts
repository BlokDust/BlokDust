/// <reference path="Primitives/MenuBase.ts" />

module Fayde.Controls {
    export class MenuItem extends Fayde.Controls.HeaderedItemsControl {
        ParentMenuBase: Primitives.MenuBase;
        Click = new RoutedEvent<RoutedEventArgs>();

        static CommandProperty = DependencyProperty.Register("Command", () => Input.ICommand_, MenuItem, undefined, (d: MenuItem, args) => d.OnCommandChanged(args));
        static CommandParameterProperty = DependencyProperty.Register("CommandParameter", () => Object, MenuItem, undefined, (d: MenuItem, args) => d.OnCommandParameterChanged(args));
        static IconProperty = DependencyProperty.Register("Icon", () => Object, MenuItem);
        Command: Input.ICommand;
        CommandParameter: any;
        Icon: any;

        private OnCommandChanged (args: IDependencyPropertyChangedEventArgs) {
            var oldcmd = Input.ICommand_.as(args.OldValue);
            if (oldcmd)
                oldcmd.CanExecuteChanged.off(this._CanExecuteChanged, this);
            var newcmd = Input.ICommand_.as(args.NewValue);
            if (newcmd)
                newcmd.CanExecuteChanged.on(this._CanExecuteChanged, this);
            this.UpdateIsEnabled();
        }

        private _CanExecuteChanged (sender: any, e: any) {
            this.UpdateIsEnabled();
        }

        private OnCommandParameterChanged (args: IDependencyPropertyChangedEventArgs) {
            this.UpdateIsEnabled();
        }


        constructor () {
            super();
            this.DefaultStyleKey = MenuItem;
            this.UpdateIsEnabled();
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }

        private UpdateIsEnabled () {
            this.IsEnabled = this.Command == null || this.Command.CanExecute(this.CommandParameter);
            this.UpdateVisualState(true);
        }

        OnGotFocus (e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.UpdateVisualState(true);
        }

        OnLostFocus (e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.UpdateVisualState(true);
        }

        OnMouseEnter (e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this.Focus();
            this.UpdateVisualState(true);
        }

        OnMouseLeave (e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            if (this.ParentMenuBase != null)
                this.ParentMenuBase.Focus();
            this.UpdateVisualState(true);
        }

        OnMouseLeftButtonDown (e: Input.MouseButtonEventArgs) {
            if (!e.Handled) {
                this.OnClick();
                e.Handled = true;
            }
            super.OnMouseLeftButtonDown(e);
        }

        OnMouseRightButtonDown (e: Input.MouseButtonEventArgs) {
            if (!e.Handled) {
                this.OnClick();
                e.Handled = true;
            }
            super.OnMouseRightButtonDown(e);
        }

        OnKeyDown (e: Input.KeyEventArgs) {
            if (!e.Handled && Input.Key.Enter === e.Key) {
                this.OnClick();
                e.Handled = true;
            }
            super.OnKeyDown(e);
        }

        private OnClick () {
            var contextMenu = <ContextMenu>this.ParentMenuBase;
            if (contextMenu instanceof ContextMenu)
                contextMenu.ChildMenuItemClicked();
            this.Click.raise(this, new RoutedEventArgs());
            if (this.Command == null || !this.Command.CanExecute(this.CommandParameter))
                return;
            this.Command.Execute(this.CommandParameter);
        }

        GoToStateCommon (gotoFunc: (state: string) => boolean): boolean {
            if (!this.IsEnabled)
                return gotoFunc("Disabled");
            return gotoFunc("Normal");
        }
    }
    TemplateVisualStates(MenuItem,
        {GroupName: "CommonStates", Name: "Normal"},
        {GroupName: "CommonStates", Name: "Disabled"},
        {GroupName: "FocusStates", Name: "Unfocused"},
        {GroupName: "FocusStates", Name: "Focused"});
}