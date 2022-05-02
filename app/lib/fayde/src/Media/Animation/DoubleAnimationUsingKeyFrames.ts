/// <reference path="AnimationUsingKeyFrames.ts" />

module Fayde.Media.Animation {
    export class DoubleAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        GenerateFrom(): AnimationBase {
            return new DoubleAnimation();
        }
        GenerateTo(isEntering: boolean): AnimationBase {
            var kfs = this.KeyFrames;
            if (kfs.Count === 0)
                return null;
            var val = (kfs.GetValueAt(isEntering ? 0 : kfs.Count - 1)).Value;
            if (val == null)
                return null;
            var da = new DoubleAnimation();
            da.To = val;
            return da;
        }
    }
    Fayde.CoreLibrary.add(DoubleAnimationUsingKeyFrames);
}