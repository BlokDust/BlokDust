/// <reference path="../../Core/DependencyObject.ts" />

module Fayde.Media.Animation {
    export interface IEasingFunction {
        Ease(normalizedTime: number): number;
    }
    export class EasingFunctionBase extends DependencyObject implements IEasingFunction {
        static EasingModeProperty: DependencyProperty = DependencyProperty.Register("EasingMode", () => new Enum(EasingMode), EasingFunctionBase);
        EasingMode: EasingMode;

        Ease(normalizedTime: number): number {
            var easingMode = this.EasingMode;
            switch (easingMode) {
                case EasingMode.EaseIn:
                    return this.EaseInCore(normalizedTime);
                case EasingMode.EaseOut:
                    return this.EaseInCore(1.0 - normalizedTime);
                case EasingMode.EaseInOut:
                    return normalizedTime <= 0.5 ?
                        this.EaseInCore(normalizedTime * 2) * 0.5 :
                        1.0 - this.EaseInCore(((1.0 - normalizedTime) * 2) * 0.5);
                default:
                    return 0.0;
            }

        }
        EaseInCore(t: number): number {
            //Abstract method
            return t;
        }
    }
}