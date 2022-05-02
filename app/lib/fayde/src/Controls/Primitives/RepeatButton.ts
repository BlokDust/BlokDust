/// <reference path="ButtonBase.ts" />

module Fayde.Controls.Primitives {
    export class RepeatButton extends ButtonBase {
        static DelayProperty = DependencyProperty.Register("Delay", () => Number, RepeatButton, 500, (d: RepeatButton, args) => d.OnDelayChanged(args));
        static IntervalProperty = DependencyProperty.Register("Interval", () => Number, RepeatButton, 33, (d: RepeatButton, args) => d.OnIntervalChanged(args));
        Delay: number;
        Interval: number;

        private _KeyboardCausingRepeat: boolean = false;
        private _MouseCausingRepeat: boolean = false;
        _MousePosition: Point = null;
        private _IntervalID: number = null;
        private _NewInterval: number = null;

        constructor() {
            super();
            this.ClickMode = ClickMode.Press;
            this.DefaultStyleKey = RepeatButton;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }

        OnDelayChanged(args: IDependencyPropertyChangedEventArgs) {
            if (args.NewValue < 0)
                throw new ArgumentException("Delay Property cannot be negative.");
        }
        OnIntervalChanged(args: IDependencyPropertyChangedEventArgs) {
            if (args.NewValue < 0)
                throw new ArgumentException("Interval Property cannot be negative.");
            this._NewInterval = args.NewValue;
        }

        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) {
            super.OnIsEnabledChanged(e);
            this._KeyboardCausingRepeat = false;
            this._MouseCausingRepeat = false;
            this._UpdateRepeatState();
        }
        OnKeyDown(e: Input.KeyEventArgs) {
            if (e.Key === Input.Key.Space && this.ClickMode !== ClickMode.Hover) {
                this._KeyboardCausingRepeat = true;
                this._UpdateRepeatState();
            }
            super.OnKeyDown(e);
        }
        OnKeyUp(e: Input.KeyEventArgs) {
            super.OnKeyUp(e);
            if (e.Key === Input.Key.Space && this.ClickMode !== ClickMode.Hover) {
                this._KeyboardCausingRepeat = false;
                this._UpdateRepeatState();
            }
            this.UpdateVisualState();
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            if (this.ClickMode !== ClickMode.Hover) {
                this._KeyboardCausingRepeat = false;
                this._MouseCausingRepeat = false;
                this._UpdateRepeatState();
            }
        }
        OnMouseEnter(e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            if (this.ClickMode === ClickMode.Hover) {
                this._MouseCausingRepeat = true;
                this._UpdateRepeatState();
            }
            this.UpdateVisualState();
            this._UpdateMousePosition(e);
        }
        OnMouseLeave(e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            if (this.ClickMode === ClickMode.Hover) {
                this._MouseCausingRepeat = false;
                this._UpdateRepeatState();
            }
            this.UpdateVisualState();
        }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;
            super.OnMouseLeftButtonDown(e);
            if (this.ClickMode !== ClickMode.Hover) {
                this._MouseCausingRepeat = true;
                this._UpdateRepeatState();
            }
        }
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;
            super.OnMouseLeftButtonUp(e);
            if (this.ClickMode !== ClickMode.Hover) {
                this._MouseCausingRepeat = false;
                this._UpdateRepeatState();
            }
            this.UpdateVisualState();
        }
        OnMouseMove(e: Input.MouseEventArgs) {
            this._UpdateMousePosition(e);
        }

        private _UpdateMousePosition(e: Input.MouseEventArgs) {
            var curNode: XamlNode = this.XamlNode;
            var parentNode: FENode = <FENode>curNode;
            while (curNode instanceof FENode) {
                parentNode = <FENode>curNode;
                curNode = curNode.ParentNode;
            }
            this._MousePosition = e.GetPosition(parentNode.XObject);
        }

        private _UpdateRepeatState() {
            if (this._MouseCausingRepeat || this._KeyboardCausingRepeat) {
                if (this._IntervalID == null)
                    this._IntervalID = window.setInterval(() => this._StartRepeatingAfterDelay(), this.Delay);
            } else {
                if (this._IntervalID != null)
                    window.clearInterval(this._IntervalID);
                this._IntervalID = null;
            }
        }

        private _StartRepeatingAfterDelay() {
            window.clearInterval(this._IntervalID);
            this._IntervalID = window.setInterval(() => this._OnTimeout(), this.Interval);
        }
        private _OnTimeout() {
            if (this._NewInterval != null) {
                window.clearInterval(this._IntervalID);
                this._IntervalID = window.setInterval(() => this._OnTimeout(), this._NewInterval);
                this._NewInterval = null;
            }

            if (!this.IsPressed)
                return;

            if (this._KeyboardCausingRepeat) {
                this.OnClick();
                return;
            }

            var els = VisualTreeHelper.FindElementsInHostCoordinates(this._MousePosition, this);
            if (els.indexOf(this) > -1) {
                this.OnClick();
            }
        }
    }
    Fayde.CoreLibrary.add(RepeatButton);
    TemplateVisualStates(RepeatButton, 
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Pressed" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" });
}