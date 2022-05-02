import TransformGroup = Fayde.Media.TransformGroup;

module Fayde.Transformer {

    export class TransformerControl extends Fayde.Controls.ContentControl {

        static ZoomFactorProperty = DependencyProperty.RegisterFull("ZoomFactor", () => Number, TransformerControl, 2, (d, args) => (<TransformerControl>d).OnZoomFactorChanged(args));
        static ZoomLevelsProperty = DependencyProperty.RegisterFull("ZoomLevels", () => Number, TransformerControl, 0, (d, args) => (<TransformerControl>d).OnZoomLevelsChanged(args));
        static ZoomLevelProperty = DependencyProperty.RegisterFull("ZoomLevel", () => Number, TransformerControl, 0, (d, args) => (<TransformerControl>d).OnZoomLevelChanged(args));
        static ConstrainToViewportProperty = DependencyProperty.RegisterFull("ConstrainToViewport", () => Boolean, TransformerControl, true, (d, args) => (<TransformerControl>d).OnConstrainToViewportChanged(args));
        static AnimationSpeedProperty = DependencyProperty.RegisterFull("AnimationSpeed", () => Number, TransformerControl, 250, (d, args) => (<TransformerControl>d).OnAnimationSpeedChanged(args));
        static DragAccelerationEnabledProperty = DependencyProperty.RegisterFull("DragAccelerationEnabled", () => Boolean, TransformerControl, true, (d, args) => (<TransformerControl>d).OnDragAccelerationEnabledChanged(args));
        static XPositionProperty = DependencyProperty.RegisterFull("XPosition", () => Number, TransformerControl, 0, (d, args) => (<TransformerControl>d).OnXPositionChanged(args));
        static YPositionProperty = DependencyProperty.RegisterFull("YPosition", () => Number, TransformerControl, 0, (d, args) => (<TransformerControl>d).OnYPositionChanged(args));

        private OnZoomFactorChanged (args: IDependencyPropertyChangedEventArgs) {
            this._Transformer.ZoomFactor = this.ZoomFactor;
            this._Transformer.ZoomTo(this.ZoomLevel);
        }

        private OnZoomLevelsChanged (args: IDependencyPropertyChangedEventArgs) {
            this._Transformer.ZoomLevels = this.ZoomLevels;
            this._Transformer.ZoomTo(this.ZoomLevel);
        }

        private OnZoomLevelChanged (args: IDependencyPropertyChangedEventArgs) {
            this._Transformer.ZoomLevel = this.ZoomLevel;
            this._Transformer.ZoomTo(this.ZoomLevel);
        }

        private OnConstrainToViewportChanged (args: IDependencyPropertyChangedEventArgs) {
            this._Transformer.ConstrainToViewport = this.ConstrainToViewport;
        }

        private OnAnimationSpeedChanged (args: IDependencyPropertyChangedEventArgs) {
            this._Transformer.AnimationSpeed = this.AnimationSpeed;
        }

        private OnDragAccelerationEnabledChanged (args: IDependencyPropertyChangedEventArgs) {
            this._Transformer.DragAccelerationEnabled = this.DragAccelerationEnabled;
        }

        private OnXPositionChanged (args: IDependencyPropertyChangedEventArgs) {
            this._Transformer.Scroll(new Point(args.NewValue, 0));
        }

        private OnYPositionChanged (args: IDependencyPropertyChangedEventArgs) {
            this._Transformer.Scroll(new Point(0, args.NewValue));
        }

        AnimationSpeed: number;
        ZoomFactor: number;
        ZoomLevels: number;
        ZoomLevel: number;
        ConstrainToViewport: boolean;
        DragAccelerationEnabled: boolean;

        private _Transformer: Transformer;

        TransformUpdated = new nullstone.Event<TransformerEventArgs>();

        get ViewportSize(): Size {
            return new Size(this.ActualWidth, this.ActualHeight);
        }

        constructor() {
            super();
            this.DefaultStyleKey = TransformerControl;

            this.MouseLeftButtonDown.on(this.Transformer_MouseLeftButtonDown, this);
            this.MouseLeftButtonUp.on(this.Transformer_MouseLeftButtonUp, this);
            this.MouseMove.on(this.Transformer_MouseMove, this);
            this.TouchDown.on(this.Transformer_TouchDown, this);
            this.TouchUp.on(this.Transformer_TouchUp, this);
            this.TouchMove.on(this.Transformer_TouchMove, this);
            this.SizeChanged.on(this.Transformer_SizeChanged, this);

            this._Transformer = new Transformer();
            this._Transformer.AnimationSpeed = this.AnimationSpeed;
            this._Transformer.ZoomFactor = this.ZoomFactor;
            this._Transformer.ZoomLevels = this.ZoomLevels;
            this._Transformer.ZoomLevel = this.ZoomLevel;
            this._Transformer.ConstrainToViewport = this.ConstrainToViewport;
            this._Transformer.DragAccelerationEnabled = this.DragAccelerationEnabled;
            this._Transformer.ViewportSize = this.ViewportSize;

            this._Transformer.UpdateTransform.on(this.UpdateTransform, this);
        }

        private UpdateTransform(sender: Transformer, e: TransformerEventArgs) : void {

            this.RenderTransform = e.Transforms;

            this.TransformUpdated.raise(this, e);
        }

        // intialise viewport size and handle resizing
        private Transformer_SizeChanged (sender: any, e: Fayde.SizeChangedEventArgs) {
            this._Transformer.SizeChanged(this.ViewportSize);
        }

        private Transformer_MouseLeftButtonDown (sender: any, e: Fayde.Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;

            this.CaptureMouse();

            this._Transformer.PointerDown(e.AbsolutePos);
        }

        private Transformer_MouseLeftButtonUp(sender: any, e: Fayde.Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;

            this._Transformer.PointerUp();

            this.ReleaseMouseCapture();
        }

        private Transformer_MouseMove(sender: any, e: Fayde.Input.MouseEventArgs) {
            if (e.Handled)
                return;

            this._Transformer.PointerMove(e.AbsolutePos);
        }

        private Transformer_TouchDown(sender: any, e: Fayde.Input.TouchEventArgs) {
            if (e.Handled)
                return;

            e.Device.Capture(this);

            var pos: Fayde.Input.TouchPoint = e.GetTouchPoint(null);
            this._Transformer.PointerDown(new Point(pos.Position.x, pos.Position.y));
        }

        private Transformer_TouchUp(sender: any, e: Fayde.Input.TouchEventArgs) {
            if (e.Handled)
                return;

            e.Device.ReleaseCapture(this);

            this._Transformer.PointerUp();
        }

        private Transformer_TouchMove(sender: any, e: Fayde.Input.TouchEventArgs) {
            if (e.Handled)
                return;

            var pos: Fayde.Input.TouchPoint = e.GetTouchPoint(null);

            this._Transformer.PointerMove(new Point(pos.Position.x, pos.Position.y));
        }
    }

}