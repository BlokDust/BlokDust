/// <reference path="AnimationBase.ts" />

module Fayde.Media.Animation {
    export class PointAnimation extends AnimationBase {
        static ByProperty: DependencyProperty = DependencyProperty.Register("By", () => Point, PointAnimation, null, (d, args) => (<PointAnimation>d)._ByChanged(args));
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, PointAnimation, undefined, (d, args) => (<PointAnimation>d)._EasingChanged(args));
        static FromProperty: DependencyProperty = DependencyProperty.Register("From", () => Point, PointAnimation, null, (d, args) => (<PointAnimation>d)._FromChanged(args));
        static ToProperty: DependencyProperty = DependencyProperty.Register("To", () => Point, PointAnimation, null, (d, args) => (<PointAnimation>d)._ToChanged(args));
        By: Point;
        EasingFunction: IEasingFunction;
        From: Point;
        To: Point;

        private _FromCached: Point = null;
        private _ToCached: Point = null;
        private _ByCached: Point = null;
        private _EasingCached: EasingFunctionBase = undefined;

        constructor() {
            super();
        }

        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): Point {
            var start = new Point();
            if (this._FromCached != null)
                start = this._FromCached;
            else if (defaultOriginalValue instanceof Point)
                start = defaultOriginalValue;

            var end = start;
            if (this._ToCached != null)
                end = this._ToCached;
            else if (this._ByCached != null)
                end = new Point(start.x + this._ByCached.x, start.y + this._ByCached.y);
            else if (defaultDestinationValue instanceof Point)
                end = defaultDestinationValue;

            var easingFunc = this._EasingCached;
            if (easingFunc != null)
                clockData.Progress = easingFunc.Ease(clockData.Progress);

            return Point.LERP(start, end, clockData.Progress);
        }
        
        private _FromChanged(args: IDependencyPropertyChangedEventArgs) {
            this._FromCached = args.NewValue;
        }
        private _ToChanged(args: IDependencyPropertyChangedEventArgs) {
            this._ToCached = args.NewValue;
        }
        private _ByChanged(args: IDependencyPropertyChangedEventArgs) {
            this._ByCached = args.NewValue;
        }
        private _EasingChanged(args: IDependencyPropertyChangedEventArgs) {
            this._EasingCached = args.NewValue;
        }
        
        GenerateFrom(): AnimationBase {
            return new PointAnimation();
        }
        GenerateTo(isEntering: boolean): AnimationBase {
            var val = (this.From != null) ? this.From : this.To;
            if (val == null)
                return null;
            var pa = new PointAnimation();
            pa.To = val;
            return pa;
        }
    }
    Fayde.CoreLibrary.add(PointAnimation);
}