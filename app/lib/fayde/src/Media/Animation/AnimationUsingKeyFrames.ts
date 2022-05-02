/// <reference path="AnimationBase.ts" />

module Fayde.Media.Animation {
    export class AnimationUsingKeyFrames extends AnimationBase {
        static KeyFramesProperty = DependencyProperty.RegisterImmutable<KeyFrameCollection>("KeyFrames", () => KeyFrameCollection, AnimationUsingKeyFrames);
        KeyFrames: KeyFrameCollection;

        constructor() {
            super();
            var coll = AnimationUsingKeyFrames.KeyFramesProperty.Initialize(this);
            coll.AttachTo(this);
        }

        Resolve(target: DependencyObject, propd: DependencyProperty): boolean {
            var keyFrames = this.KeyFrames;

            var sortedList = KeyFrameCollection.ResolveKeyFrames(this, keyFrames);

            var count = sortedList.length;
            for (var j = 0; j < count; j++) {
                if (!sortedList[j].KeyTime.IsValid)
                    return false;
            }

            return true;
        }
        GetCurrentValue(defaultOriginValue: any, defaultDestinationValue: any, clockData: IClockData): any {
            var keyFrames = this.KeyFrames;

            var prevFrameRef = { Value: <IKeyFrame>null };
            var currentKeyFrame: IKeyFrame = keyFrames.GetKeyFrameForTime(clockData.CurrentTime, prevFrameRef);
            var prevFrame: IKeyFrame = prevFrameRef.Value;
            if (!currentKeyFrame)
                return null;

            var baseValue: any;
            var keyStartTime: TimeSpan;
            var keyEndTime = currentKeyFrame._ResolvedKeyTime;
            if (!prevFrame) {
                // the first keyframe, start at the animation's base value
                baseValue = defaultOriginValue;
                keyStartTime = new TimeSpan();
            } else {
                // start at the previous keyframe's target value
                if (prevFrame instanceof ObjectKeyFrame) {
                    baseValue = (<ObjectKeyFrame>prevFrame).ConvertedValue;
                } else {
                    baseValue = prevFrame.Value;
                }
                keyStartTime = prevFrame._ResolvedKeyTime;
            }

            var progress: number;
            if (clockData.CurrentTime.CompareTo(keyEndTime) >= 0) {
                progress = 1.0;
            } else {
                var keyDuration = keyEndTime.Ticks - keyStartTime.Ticks;
                if (keyDuration <= 0)
                    progress = 1.0;
                else
                    progress = (clockData.CurrentTime.Ticks - keyStartTime.Ticks) / keyDuration;
            }

            return currentKeyFrame.InterpolateValue(baseValue, progress);
        }
        GetNaturalDurationCore(): Duration {
            var keyFrames = this.KeyFrames;
            var sortedList: IKeyFrame[] = KeyFrameCollection.ResolveKeyFrames(this, keyFrames);
            var len = sortedList.length;
            var ts: TimeSpan;
            if (len > 0)
                ts = sortedList[len - 1]._ResolvedKeyTime;
            else
                ts = new TimeSpan();
            return new Duration(ts);
        }

        AddKeyFrame(kf: KeyFrame) { this.KeyFrames.Add(kf); }
        RemoveKeyFrame(kf: KeyFrame) { this.KeyFrames.Remove(kf); }
    }
    Fayde.CoreLibrary.add(AnimationUsingKeyFrames);
    Markup.Content(AnimationUsingKeyFrames, AnimationUsingKeyFrames.KeyFramesProperty);
}