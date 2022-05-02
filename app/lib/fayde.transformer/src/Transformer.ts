import ScaleTransform = Fayde.Media.ScaleTransform;
import TranslateTransform = Fayde.Media.TranslateTransform;
import Vector = Fayde.Utils.Vector;

module Fayde.Transformer {

    var MAX_FPS: number = 100;
    var MAX_MSPF: number = 1000 / MAX_FPS;

    export class Transformer {

        private _TweenEasing: any;
        private _Timer: Fayde.ClockTimer;

        private _LastVisualTick: number = new Date(0).getTime();
        private _IsPointerDown: boolean = false;
        private _IsDragging: boolean = false;
        private _LastPointerPosition: Vector;
        private _LastDragAccelerationPointerPosition: Vector;
        private _PointerPosition: Vector;
        private _PointerDelta: Vector = new Vector(0, 0);
        private _DragVelocity: Vector = new Vector(0, 0);
        private _DragAcceleration: Vector = new Vector(0, 0);
        private _VelocityAccumulationTolerance: number = 10; // dragging faster than this builds velocity
        private _DragMinSpeed: number = 2;
        private _DragMaxSpeed: number = 30;
        private _DragFriction: number = 2;
        private _TranslateTransform: TranslateTransform;
        private _ScaleTransform: ScaleTransform;

        public ViewportSize: Size;
        public AnimationSpeed: number;
        public ZoomFactor: number;
        public ZoomLevels: number;
        public ZoomLevel: number;
        public ConstrainToViewport: boolean;
        public DragAccelerationEnabled: boolean;

        public UpdateTransform = new nullstone.Event<TransformerEventArgs>();

        get ScaleTransform(): ScaleTransform {
            if (!this._ScaleTransform){
                var scaleTransform = new ScaleTransform();
                scaleTransform.ScaleX = 1;
                scaleTransform.ScaleY = 1;
                return scaleTransform;
            }
            return this._ScaleTransform;
        }

        set ScaleTransform(value: ScaleTransform) {
            this._ScaleTransform = value;
        }

        get TranslateTransform(): TranslateTransform {
            if (!this._TranslateTransform){
                var translateTransform = new TranslateTransform();
                translateTransform.X = 0;
                translateTransform.Y = 0;
                return translateTransform;
            }

            return this._TranslateTransform;
        }

        set TranslateTransform(value: TranslateTransform){
            this._TranslateTransform = value;
        }

        constructor() {
            this._TweenEasing = TWEEN.Easing.Quadratic.InOut;

            this._Timer = new Fayde.ClockTimer();
            this._Timer.RegisterTimer(this);
        }

        OnTicked (lastTime: number, nowTime: number) {
            var now = new Date().getTime();
            if (now - this._LastVisualTick < MAX_MSPF) return;
            this._LastVisualTick = now;

            TWEEN.update(nowTime);

            if (this.DragAccelerationEnabled){
                this._AddVelocity();
            }

            if (this.ConstrainToViewport){
                this._Constrain();
            }

            var transforms = new TransformGroup();
            transforms.Children.Add(this.ScaleTransform);
            transforms.Children.Add(this.TranslateTransform);

            this.UpdateTransform.raise(this, new TransformerEventArgs(transforms));
        }

        // todo: rename this to UpdateSize
        public SizeChanged(viewportSize: Size) {
            this.ViewportSize = viewportSize;
            this.ScaleTransform = this._GetTargetScaleTransform(this.ZoomLevel);
            this.TranslateTransform = this._GetTargetTranslateTransform(this.ScaleTransform);
        }

        private _ValidateZoomLevel(level: number): boolean {
            return (level >= 0) && (level <= this.ZoomLevels);
        }

        // pass a positive or negative value
        public Zoom(amount: number) {
            var newLevel = this.ZoomLevel + amount;

            if (!this._ValidateZoomLevel(newLevel)) return;

            this.ZoomLevel = newLevel;

            this.ZoomTo(newLevel);
        }

        public ZoomTo(level: number): void {

            if (!this._ValidateZoomLevel(level)) return;

            var scale = this._GetTargetScaleTransform(level);
            var translate = this._GetTargetTranslateTransform(scale);

            var currentSize: Size = new Size(this.ScaleTransform.ScaleX, this.ScaleTransform.ScaleY);
            var newSize: Size = new Size(scale.ScaleX, scale.ScaleY);

            var zoomTween = new TWEEN.Tween(currentSize)
                .to(newSize, this.AnimationSpeed)
                .delay(0)
                .easing(this._TweenEasing)
                .onUpdate(() => {
                    this.ScaleTransform.ScaleX = currentSize.width;
                    this.ScaleTransform.ScaleY = currentSize.height;
                })
                .onComplete(() => {
                    //console.log("zoomLevel: " + this.ZoomLevel);
                });

            zoomTween.start(this._LastVisualTick);

            this.ScrollTo(translate);
        }

        private _GetTargetScaleTransform(level: number): ScaleTransform {
            var transform = new ScaleTransform();

            transform.ScaleX = Math.pow(this.ZoomFactor, level);
            transform.ScaleY = Math.pow(this.ZoomFactor, level);

            return transform;
        }

        public Scroll(position: Point) {
            var t: TranslateTransform = new TranslateTransform();
            t.X = this.TranslateTransform.X + position.x;
            t.Y = this.TranslateTransform.Y + position.y;

            this.ScrollTo(t);
        }

        public ScrollTo(newTransform: TranslateTransform) {

            var currentOffset: Size = new Size(this.TranslateTransform.X, this.TranslateTransform.Y);
            var newOffset: Size = new Size(newTransform.X, newTransform.Y);

            var scrollTween = new TWEEN.Tween(currentOffset)
                .to(newOffset, this.AnimationSpeed)
                .delay(0)
                .easing(this._TweenEasing)
                .onUpdate(() => {
                    this.TranslateTransform.X = currentOffset.width;
                    this.TranslateTransform.Y = currentOffset.height;
                });

            scrollTween.start(this._LastVisualTick);
        }

        private _GetTargetTranslateTransform(targetScaleTransform: ScaleTransform): TranslateTransform {

            var currentCenter = this._GetZoomOrigin(this.ScaleTransform);
            var targetCenter = this._GetZoomOrigin(targetScaleTransform);
            var diff: Point = new Point(targetCenter.x - currentCenter.x, targetCenter.y - currentCenter.y);

            var translateTransform = new TranslateTransform();
            translateTransform.X = this.TranslateTransform.X - diff.x;
            translateTransform.Y = this.TranslateTransform.Y - diff.y;

            return translateTransform;
        }

        private _GetZoomOrigin(scaleTransform: ScaleTransform) {
            // todo: use this.RenderTransformOrigin instead of halving width

            var width = scaleTransform.ScaleX * this.ViewportSize.width;
            var height = scaleTransform.ScaleY * this.ViewportSize.height;

            return new Point(width * 0.5, height * 0.5);
        }

        private _Constrain(){

            if (this.TranslateTransform.X > 0){
                this.TranslateTransform.X = 0;
            }

            var width = this.ScaleTransform.ScaleX * this.ViewportSize.width;

            if (this.TranslateTransform.X < (width - this.ViewportSize.width) * -1){
                this.TranslateTransform.X = (width - this.ViewportSize.width) * -1;
            }

            if (this.TranslateTransform.Y > 0){
                this.TranslateTransform.Y = 0;
            }

            var height = this.ScaleTransform.ScaleY * this.ViewportSize.height;

            if (this.TranslateTransform.Y < (height - this.ViewportSize.height) * -1){
                this.TranslateTransform.Y = (height - this.ViewportSize.height) * -1;
            }
        }

        private _AddVelocity(){

            var pointerStopped = false;

            if (this._LastDragAccelerationPointerPosition && this._LastDragAccelerationPointerPosition.Equals(this._PointerPosition)){
                pointerStopped = true;
            }

            this._LastDragAccelerationPointerPosition = this._PointerPosition;

            if (this._IsDragging) {
                if (pointerStopped){
                    // pointer isn't moving. remove velocity
                    this._RemoveVelocity();
                } else {
                    // only add to velocity if dragging fast enough
                    if (this._PointerDelta.Mag() > this._VelocityAccumulationTolerance) {
                        // calculate acceleration
                        this._DragAcceleration.Add(this._PointerDelta);

                        // integrate acceleration
                        this._DragVelocity.Add(this._DragAcceleration);
                        this._DragVelocity.Limit(this._DragMaxSpeed);
                    }
                }
            } else {
                // decelerate if _DragVelocity is above minimum speed
                if (this._DragVelocity.Mag() > this._DragMinSpeed) {
                    // calculate deceleration
                    var friction = this._DragVelocity.Get();
                    friction.Mult(-1);
                    friction.Normalise();
                    friction.Mult(this._DragFriction);
                    this._DragAcceleration.Add(friction);

                    // integrate deceleration
                    this._DragVelocity.Add(this._DragAcceleration);

                    this.TranslateTransform.X += this._DragVelocity.X;
                    this.TranslateTransform.Y += this._DragVelocity.Y;
                }
            }

            // reset acceleration
            this._DragAcceleration.Mult(0);
        }

        private _RemoveVelocity(){
            this._DragVelocity.Mult(0);
        }

        public PointerDown(position: Point) {
            this._IsPointerDown = true;

            this._LastPointerPosition = this._PointerPosition || new Vector(0, 0);
            this._PointerPosition = new Vector(position.x, position.y);
            this._RemoveVelocity();
        }

        public PointerUp() {
            this._IsPointerDown = false;
            this._IsDragging = false;
        }

        public PointerMove(position: Point) {
            if (this._IsPointerDown){
                this._IsDragging = true;
            }

            this._LastPointerPosition = this._PointerPosition || new Vector(0, 0);
            this._PointerPosition = new Vector(position.x, position.y);

            this._PointerDelta = this._PointerPosition.Get();
            this._PointerDelta.Sub(this._LastPointerPosition);

            if (this._IsDragging){
                this.TranslateTransform.X += this._PointerDelta.X;
                this.TranslateTransform.Y += this._PointerDelta.Y;
            }
        }
    }
}