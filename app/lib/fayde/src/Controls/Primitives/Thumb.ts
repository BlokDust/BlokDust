/// <reference path="../Control.ts" />

module Fayde.Controls.Primitives {
    export class Thumb extends Control {
        private _PreviousPosition: Point = null;
        private _Origin: Point = null;

        DragCompleted = new RoutedEvent<DragCompletedEventArgs>();
        DragDelta = new RoutedEvent<DragDeltaEventArgs>();
        DragStarted = new RoutedEvent<DragStartedEventArgs>();

        static IsDraggingProperty = DependencyProperty.RegisterReadOnly("IsDragging", () => Boolean, Thumb, false, (d, args) => (<Thumb>d).OnDraggingChanged(args));
        static IsFocusedProperty = DependencyProperty.RegisterReadOnly("IsFocused", () => Boolean, Thumb);
        IsDragging: boolean;
        IsFocused: boolean;

        constructor() {
            super();
            this.DefaultStyleKey = Thumb;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }

        private OnDraggingChanged(args: IDependencyPropertyChangedEventArgs) {
            this.UpdateVisualState();
        }

        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this._FocusChanged(Surface.HasFocus(this));
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this._FocusChanged(Surface.HasFocus(this));
        }
        private _FocusChanged(hasFocus: boolean) {
            this.SetCurrentValue(Thumb.IsFocusedProperty, hasFocus);
            this.UpdateVisualState();
        }

        OnLostMouseCapture(e: Input.MouseEventArgs) {
            if (!this.IsDragging || !this.IsEnabled)
                return;
            this.SetCurrentValue(Thumb.IsDraggingProperty, false);
            this._RaiseDragCompleted(false);
        }
        OnMouseEnter(e: Input.MouseEventArgs) {
            if (this.IsEnabled)
                this.UpdateVisualState();
        }
        OnMouseLeave(e: Input.MouseEventArgs) {
            if (this.IsEnabled)
                this.UpdateVisualState();
        }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            if (e.Handled || this.IsDragging || !this.IsEnabled)
                return;
            e.Handled = true;
            this.CaptureMouse();
            this.SetCurrentValue(Thumb.IsDraggingProperty, true);

            var vpNode = this.XamlNode.VisualParentNode;
            this._Origin = this._PreviousPosition = e.GetPosition((vpNode) ? vpNode.XObject : undefined);
            var success = false;
            try {
                this._RaiseDragStarted();
                success = true;
            } finally {
                if (!success)
                    this.CancelDrag();
            }
        }
        OnMouseMove(e: Input.MouseEventArgs) {
            if (!this.IsDragging)
                return;
            var vpNode = this.XamlNode.VisualParentNode;
            var p = e.GetPosition((vpNode) ? vpNode.XObject : undefined);
            if (!minerva.Point.isEqual(p, this._PreviousPosition)) {
                this._RaiseDragDelta(p.x - this._PreviousPosition.x, p.y - this._PreviousPosition.y);
                this._PreviousPosition = p;
            }
        }

        OnLostTouchCapture(e: Input.TouchEventArgs) {
            super.OnLostTouchCapture(e);
            if (!this.IsDragging || !this.IsEnabled)
                return;
            this.SetCurrentValue(Thumb.IsDraggingProperty, false);
            this._RaiseDragCompleted(false);
        }
        OnTouchEnter(e: Input.TouchEventArgs) {
            super.OnTouchEnter(e);
            if (this.IsEnabled)
                this.UpdateVisualState();
        }
        OnTouchLeave(e: Input.TouchEventArgs) {
            super.OnTouchLeave(e);
            if (this.IsEnabled)
                this.UpdateVisualState();
        }
        OnTouchDown(e: Input.TouchEventArgs) {
            super.OnTouchDown(e);
            if (e.Handled || this.IsDragging || !this.IsEnabled)
                return;
            e.Handled = true;
            e.Device.Capture(this);
            this.SetCurrentValue(Thumb.IsDraggingProperty, true);

            var vpNode = this.XamlNode.VisualParentNode;
            var tp = e.GetTouchPoint(vpNode ? vpNode.XObject : undefined);
            this._Origin = this._PreviousPosition = tp.Position;
            var success = false;
            try {
                this._RaiseDragStarted();
                success = true;
            } finally {
                if (!success)
                    this.CancelDrag();
            }
        }
        OnTouchUp(e: Input.TouchEventArgs) {
            super.OnTouchUp(e);
            if (e.Handled || !this.IsDragging || !this.IsEnabled)
                return;
            e.Handled = true;
            e.Device.ReleaseCapture(this);
        }
        OnTouchMove(e: Input.TouchEventArgs) {
            super.OnTouchMove(e);
            if (!this.IsDragging || e.Device.Captured !== this)
                return;
            var vpNode = this.XamlNode.VisualParentNode;
            var tp = e.Device.GetTouchPoint(vpNode ? vpNode.XObject : undefined);
            var pos = tp.Position;
            if (!minerva.Point.isEqual(pos, this._PreviousPosition)) {
                this._RaiseDragDelta(pos.x - this._PreviousPosition.x, pos.y - this._PreviousPosition.y);
                this._PreviousPosition = pos;
            }
        }

        CancelDrag() {
            if (!this.IsDragging)
                return;
            this.SetCurrentValue(Thumb.IsDraggingProperty, false);
            this._RaiseDragCompleted(true);
        }

        private _RaiseDragStarted() {
            this.DragStarted.raise(this, new DragStartedEventArgs(this._Origin.x, this._Origin.y));
        }
        private _RaiseDragDelta(x: number, y: number) {
            this.DragDelta.raise(this, new DragDeltaEventArgs(x, y));
        }
        private _RaiseDragCompleted(canceled: boolean) {
            this.DragCompleted.raise(this, new DragCompletedEventArgs(this._PreviousPosition.x - this._Origin.x, this._PreviousPosition.y - this._Origin.y, canceled));
        }

        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean {
            if (!this.IsEnabled)
                return gotoFunc("Disabled");
            if (this.IsDragging)
                return gotoFunc("Pressed");
            if (this.IsMouseOver)
                return gotoFunc("MouseOver");
            return gotoFunc("Normal");
        }
    }
    Fayde.CoreLibrary.add(Thumb);
    TemplateVisualStates(Thumb,
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Pressed" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" });
}