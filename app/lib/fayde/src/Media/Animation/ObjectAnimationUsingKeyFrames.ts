/// <reference path="AnimationUsingKeyFrames.ts" />

module Fayde.Media.Animation {
    export class ObjectAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        Resolve (target: DependencyObject, propd: DependencyProperty): boolean {
            for (var en = this.KeyFrames.getEnumerator(); en.moveNext();) {
                var keyFrame = <ObjectKeyFrame>en.current;
                var value = keyFrame.Value;
                if (value == null) {
                    keyFrame.ConvertedValue = undefined;
                } else {
                    var cv = convertKeyFrame(propd, value);
                    if (cv === BAD_CONVERSION)
                        return false;
                    keyFrame.ConvertedValue = cv;
                }
            }
            return super.Resolve(target, propd);
        }
    }
    Fayde.CoreLibrary.add(ObjectAnimationUsingKeyFrames);

    var BAD_CONVERSION = {};

    function convertKeyFrame (propd: DependencyProperty, value: any): any {
        try {
            return nullstone.convertAnyToType(value, <Function>propd.GetTargetType());
        } catch (err) {
            console.warn("Error resolving ObjectAnimation Value.");
            return BAD_CONVERSION;
        }
    }
}