/// <reference path="AnimationBase.ts" />

module Fayde.Media.Animation {
    export class DoubleAnimation extends AnimationBase {
        static ByProperty: DependencyProperty = DependencyProperty.Register("By", () => Number, DoubleAnimation, null, (d, args) => (<DoubleAnimation>d)._ByChanged(args));
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, DoubleAnimation, undefined, (d, args) => (<DoubleAnimation>d)._EasingChanged(args));
        static FromProperty: DependencyProperty = DependencyProperty.Register("From", () => Number, DoubleAnimation, null, (d, args) => (<DoubleAnimation>d)._FromChanged(args));
        static ToProperty: DependencyProperty = DependencyProperty.Register("To", () => Number, DoubleAnimation, null, (d, args) => (<DoubleAnimation>d)._ToChanged(args));
        By: number;
        EasingFunction: IEasingFunction;
        From: number;
        To: number;

        private _FromCached: number = null;
        private _ToCached: number = null;
        private _ByCached: number = null;
        private _EasingCached: EasingFunctionBase = undefined;

        constructor(){
            super();
        }

        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): number {
            var start = 0.0;
            if (this._FromCached != null)
                start = this._FromCached;
            else if (defaultOriginalValue != null && typeof defaultOriginalValue === "number")
                start = defaultOriginalValue;

            var end = start;
            if (this._ToCached != null)
                end = this._ToCached;
            else if (this._ByCached != null)
                end = start + this._ByCached;
            else if (defaultDestinationValue != null && typeof defaultDestinationValue === "number")
                end = defaultDestinationValue;

            var easingFunc = this._EasingCached;
            if (easingFunc != null)
                clockData.Progress = easingFunc.Ease(clockData.Progress);

            return start + ((end - start) * clockData.Progress);
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
            return new DoubleAnimation();
        }
        GenerateTo(isEntering: boolean): AnimationBase {
            var val = (this.From != null) ? this.From : this.To;
            if (val == null)
                return null;
            var da = new DoubleAnimation();
            da.To = val;
            return da;
        }
    }
    Fayde.CoreLibrary.add(DoubleAnimation);
}