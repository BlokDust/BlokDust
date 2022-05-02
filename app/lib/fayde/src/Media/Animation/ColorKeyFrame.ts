/// <reference path="KeyFrame.ts" />

module Fayde.Media.Animation {
    export class ColorKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty = DependencyProperty.Register("Value", () => Color, ColorKeyFrame);
        Value: Color;
    }
    Fayde.CoreLibrary.add(ColorKeyFrame);

    export class DiscreteColorKeyFrame extends ColorKeyFrame {
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            return baseValue;
        }
    }
    Fayde.CoreLibrary.add(DiscreteColorKeyFrame);

    export class EasingColorKeyFrame extends ColorKeyFrame {
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, EasingColorKeyFrame);
        EasingFunction: EasingFunctionBase;

        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color {
            if (keyFrameProgress >= 1.0)
                return this.Value;

            var start = baseValue;
            var end = this.Value;

            var easingFunction = this.EasingFunction;
            if (easingFunction)
                keyFrameProgress = easingFunction.Ease(keyFrameProgress);

            return Color.LERP(start, end, keyFrameProgress);
        }
    }
    Fayde.CoreLibrary.add(EasingColorKeyFrame);

    export class LinearColorKeyFrame extends ColorKeyFrame {
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color {
            return Color.LERP(baseValue, this.Value, keyFrameProgress);
        }
    }
    Fayde.CoreLibrary.add(LinearColorKeyFrame);

    export class SplineColorKeyFrame extends ColorKeyFrame {
        static KeySplineProperty: DependencyProperty = DependencyProperty.Register("KeySpline", () => KeySpline, SplineColorKeyFrame);
        KeySpline: KeySpline;

        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color {
            if (keyFrameProgress >= 1.0)
                return this.Value;

            var start = baseValue;
            var end = this.Value;
            var splineProgress = keyFrameProgress;
            var keySpline = this.KeySpline;
            if (keySpline)
                splineProgress = keySpline.GetSplineProgress(keyFrameProgress);

            return Color.LERP(start, end, splineProgress);
        }
    }
    Fayde.CoreLibrary.add(SplineColorKeyFrame);
}