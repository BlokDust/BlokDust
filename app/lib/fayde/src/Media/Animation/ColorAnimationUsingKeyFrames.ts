/// <reference path="AnimationUsingKeyFrames.ts" />

module Fayde.Media.Animation {
    export class ColorAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        GenerateFrom(): AnimationBase {
            return new ColorAnimation();
        }
        GenerateTo(isEntering: boolean): AnimationBase {
            var kfs = this.KeyFrames;
            if (kfs.Count === 0)
                return null;
            var val = (kfs.GetValueAt(isEntering ? 0 : kfs.Count - 1)).Value;
            if (val == null)
                return null;
            var ca = new Animation.ColorAnimation();
            ca.To = val;
            return ca;
        }
    }
    Fayde.CoreLibrary.add(ColorAnimationUsingKeyFrames);
}