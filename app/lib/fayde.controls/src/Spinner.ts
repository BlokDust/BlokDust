/// <reference path="Enums.ts" />

module Fayde.Controls {
    import ButtonBase = Controls.Primitives.ButtonBase;

    export class Spinner extends Control {
        static ContentProperty = DependencyProperty.Register("Content", () => Object, Spinner, undefined, (d: Spinner, args) => d.OnContentChanged(args.OldValue, args.NewValue));
        static ValidSpinDirectionProperty = DependencyProperty.Register("ValidSpinDirection", () => new Enum(ValidSpinDirections), Spinner, ValidSpinDirections.Increase, (d, args) => (<Spinner>d).OnValidSpinDirectionChanged(args));
        Content: any;
        ValidSpinDirection: ValidSpinDirections;

        OnContentChanged (oldContent: any, newContent: any) {

        }

        OnValidSpinDirectionChanged (args: IDependencyPropertyChangedEventArgs) {
            this.UpdateVisualState(true);
            this.EnableButtons();
        }

        Spin = new RoutedEvent<SpinEventArgs>();

        OnSpin (e: SpinEventArgs) {
            var valid = e.Direction === SpinDirection.Increase ? ValidSpinDirections.Increase : ValidSpinDirections.Decrease;
            if ((this.ValidSpinDirection & valid) !== valid)
                throw new InvalidOperationException("Invalid Spin Direction");
            this.Spin.raise(this, e);
        }

        private _IncreaseButton: ButtonBase = null;
        private _DecreaseButton: ButtonBase = null;

        constructor () {
            super();
            this.DefaultStyleKey = Spinner;
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();

            if (this._IncreaseButton)
                this._IncreaseButton.Click.off(this.OnIncreaseClick, this);
            this._IncreaseButton = <ButtonBase>this.GetTemplateChild("IncreaseButton", ButtonBase);
            if (this._IncreaseButton)
                this._IncreaseButton.Click.on(this.OnIncreaseClick, this);

            if (this._DecreaseButton)
                this._DecreaseButton.Click.off(this.OnDecreaseClick, this);
            this._DecreaseButton = <ButtonBase>this.GetTemplateChild("DecreaseButton", ButtonBase);
            if (this._DecreaseButton)
                this._DecreaseButton.Click.on(this.OnDecreaseClick, this);

            this.UpdateVisualState(false);
            this.EnableButtons();
        }

        private OnIncreaseClick (sender: any, e: Fayde.Input.MouseButtonEventArgs) {
            this.OnSpin(new SpinEventArgs(SpinDirection.Increase));
        }

        private OnDecreaseClick (sender: any, e: Fayde.Input.MouseButtonEventArgs) {
            this.OnSpin(new SpinEventArgs(SpinDirection.Decrease));
        }

        private EnableButtons () {
            if (this._IncreaseButton)
                this._IncreaseButton.IsEnabled = (this.ValidSpinDirection & ValidSpinDirections.Increase) === ValidSpinDirections.Increase;
            if (this._DecreaseButton)
                this._DecreaseButton.IsEnabled = (this.ValidSpinDirection & ValidSpinDirections.Decrease) === ValidSpinDirections.Decrease;
        }

        GoToStates (gotoFunc: (state: string) => boolean) {
            super.GoToStates(gotoFunc);
            this.GoToStateIncrease(gotoFunc);
            this.GoToStateDecrease(gotoFunc);
        }

        GoToStateCommon (gotoFunc: (state: string) => boolean): boolean {
            if (!this.IsEnabled)
                return gotoFunc("Disabled");
            if (this.IsMouseOver)
                return gotoFunc("MouseOver");
            return gotoFunc("Normal");
        }

        GoToStateIncrease (gotoFunc: (state: string) => boolean): boolean {
            return gotoFunc(((this.ValidSpinDirection & ValidSpinDirections.Increase) === ValidSpinDirections.Increase) ? "IncreaseEnabled" : "IncreaseDisabled");
        }

        GoToStateDecrease (gotoFunc: (state: string) => boolean): boolean {
            return gotoFunc(((this.ValidSpinDirection & ValidSpinDirections.Decrease) === ValidSpinDirections.Decrease) ? "DecreaseEnabled" : "DecreaseDisabled");
        }

        OnMouseEnter (e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this.UpdateVisualState();
        }

        OnMouseLeave (e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            this.UpdateVisualState();
        }

        OnMouseLeftButtonDown (e: Input.MouseButtonEventArgs) {
            this.UpdateVisualState();
            super.OnMouseLeftButtonDown(e);
        }

        OnMouseLeftButtonUp (e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonUp(e);
            this.UpdateVisualState();
        }

        OnGotFocus (e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.UpdateVisualState();
        }

        OnLostFocus (e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.UpdateVisualState();
        }
    }
    Markup.Content(Spinner, Spinner.ContentProperty);
    TemplateVisualStates(Spinner,
        {GroupName: "CommonStates", Name: "Normal"},
        {GroupName: "CommonStates", Name: "MouseOver"},
        {GroupName: "CommonStates", Name: "Disabled"},
        {GroupName: "FocusStates", Name: "Unfocused"},
        {GroupName: "FocusStates", Name: "Focused"},
        {GroupName: "IncreaseStates", Name: "IncreaseEnabled"},
        {GroupName: "IncreaseStates", Name: "IncreaseDisabled"},
        {GroupName: "DecreaseStates", Name: "DecreaseEnabled"},
        {GroupName: "DecreaseStates", Name: "DecreaseDisabled"});
    TemplateParts(Spinner,
        {Name: "IncreaseButton", Type: Primitives.ButtonBase},
        {Name: "DecreaseButton", Type: Primitives.ButtonBase});
}