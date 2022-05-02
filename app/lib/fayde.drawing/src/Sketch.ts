module Fayde.Drawing {
    var MAX_FPS: number = 100;
    var MAX_MSPF: number = 1000 / MAX_FPS;

    export class Sketch extends FrameworkElement {
        CreateLayoutUpdater () {
            var upd = new sketch.SketchUpdater();
            upd.assets.sketcher = (canvas, w, h) => this.RaiseDraw(canvas, w, h);
            return upd;
        }

        static IsAnimatedProperty = DependencyProperty.Register("IsAnimated", () => Boolean, Sketch, false, (d: Sketch, args) => d.OnIsAnimatedChanged(args));
        IsAnimated: boolean;

        private _Timer: Fayde.ClockTimer;
        private _LastVisualTick: number = new Date(0).getTime();
        Milliseconds: number;
        Draw = new nullstone.Event<SketchDrawEventArgs>();
        Click = new RoutedEvent<RoutedEventArgs>();
        MousePosition: Point = new Point();

        constructor () {
            super();
            this.DefaultStyleKey = Sketch;

            this._Timer = new Fayde.ClockTimer();
            this._Timer.RegisterTimer(this);
        }

        RaiseDraw (canvas: HTMLCanvasElement, width: number, height: number) {
            var session = new SketchSession(canvas, width, height, this.Milliseconds);
            this.Draw.raise(this, new SketchDrawEventArgs(session));
        }

        OnTicked (lastTime: number, nowTime: number) {
            if (!this.IsAnimated) return;

            var now = new Date().getTime();
            if (now - this._LastVisualTick < MAX_MSPF)
                return;
            this._LastVisualTick = now;

            this.Milliseconds = nowTime;

            this.XamlNode.LayoutUpdater.invalidate();
        }

        private OnIsAnimatedChanged (args: IDependencyPropertyChangedEventArgs) {

        }

        OnMouseEnter (e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
        }

        OnMouseLeave (e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
        }

        OnMouseMove (e: Input.MouseEventArgs) {
            super.OnMouseMove(e);

            this.MousePosition = e.GetPosition(this);
        }

        OnMouseLeftButtonDown (e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);

            //e.Handled = true; // stop it bubbling up further
        }

        OnMouseLeftButtonUp (e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonUp(e);

            //e.Handled = true; // stop it bubbling up further
        }

        OnTouchDown (e: Input.TouchEventArgs) {
            super.OnTouchDown(e);

            //e.Handled = true; // stop it bubbling up further
        }
    }
}