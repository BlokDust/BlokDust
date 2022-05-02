/// <reference path="AnimationUsingKeyFrames.ts" />

module Fayde.Media.Animation {
    export class PointAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        GenerateFrom(): AnimationBase {
            return new PointAnimation();
        }
        GenerateTo(isEntering: boolean): AnimationBase {
            var kfs = this.KeyFrames;
            if (kfs.Count === 0)
                return null;
            var val = (kfs.GetValueAt(isEntering ? 0 : kfs.Count - 1)).Value;
            if (val == null)
                return null;
            var pa = new PointAnimation();
            pa.To = val;
            return pa;
        }
    }
    Fayde.CoreLibrary.add(PointAnimationUsingKeyFrames);
}