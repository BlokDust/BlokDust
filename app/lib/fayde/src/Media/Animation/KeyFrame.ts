/// <reference path="../../Core/DependencyObject.ts" />
/// <reference path="../../Core/XamlObjectCollection.ts" />

module Fayde.Media.Animation {
    export interface IOutValue {
        Value: any;
    }
    export interface IKeyFrameListener {
        KeyFrameChanged(source: KeyFrame);
    }
    export interface IKeyFrame {
        _ResolvedKeyTime: TimeSpan;
        _Resolved: boolean;
        Value: any;
        InterpolateValue(baseValue: any, keyFrameProgress: number): any;
    }

    export class KeyFrame extends DependencyObject implements IKeyFrame {
        _ResolvedKeyTime: TimeSpan = null;
        _Resolved: boolean = false;
        private _Listener: IKeyFrameListener;

        static KeyTimeProperty: DependencyProperty = DependencyProperty.Register("KeyTime", () => KeyTime, KeyFrame, undefined, (d, args) => (<KeyFrame>d).InvalidateKeyFrame());
        KeyTime: KeyTime;
        Value: any;

        CoerceKeyTime(dobj: DependencyObject, propd: DependencyProperty, value: any, coerced: IOutValue, error: BError): boolean {
            if (!value)
                coerced.Value = this.KeyTime;
            else
                coerced.Value = value;
            return true;
        }

        InterpolateValue(baseValue: any, keyFrameProgress: number): any {
            //Abstract Method
            return undefined;
        }

        CompareToTimeSpan(otherTs: TimeSpan): number {
            return this._ResolvedKeyTime.CompareTo(otherTs);
        }

        Listen(listener: IKeyFrameListener) { this._Listener = listener; }
        Unlisten(listener: IKeyFrameListener) { if (this._Listener === listener) this._Listener = null; }

        InvalidateKeyFrame() {
            var listener = this._Listener;
            if (listener) listener.KeyFrameChanged(this);
        }

        static Comparer(kf1: KeyFrame, kf2: KeyFrame): number {
            var ts1 = kf1._ResolvedKeyTime;
            var ts2 = kf2._ResolvedKeyTime;
            return ts1.CompareTo(ts2);
        }

        /// http://msdn2.microsoft.com/en-us/library/ms742524.aspx (Bottom of page)
        static ResolveKeyFrames(animation: AnimationBase, arr: KeyFrame[]): KeyFrame[] {
            var totalInterpolationTime: TimeSpan;
            var hasTimeSpanKeyFrame = false;
            var highestKeyTimeTimeSpan = new TimeSpan();
            var keyFrame: KeyFrame;

            var len = arr.length;

            var i: number;
            for (i = 0; i < len; i++) {
                keyFrame = arr[i];
                keyFrame._ResolvedKeyTime = new TimeSpan();
                keyFrame._Resolved = false;
            }

            var keyTime: KeyTime;
            // resolve TimeSpan keyframes
            for (i = 0; i < len; i++) {
                keyFrame = arr[i];
                keyTime = keyFrame.KeyTime;
                if (keyTime.HasTimeSpan) {
                    hasTimeSpanKeyFrame = true;
                    var ts = keyTime.TimeSpan;
                    if (ts.CompareTo(highestKeyTimeTimeSpan) > 0)
                        highestKeyTimeTimeSpan = ts;
                    keyFrame._ResolvedKeyTime = ts;
                    keyFrame._Resolved = true;
                }
            }

            // calculate total animation interpolation time
            var dur = animation.Duration;
            if (dur && dur.HasTimeSpan) {
                totalInterpolationTime = dur.TimeSpan;
            } else if (hasTimeSpanKeyFrame) {
                totalInterpolationTime = highestKeyTimeTimeSpan;
            } else {
                totalInterpolationTime = new TimeSpan(TimeSpan._TicksPerSecond);
            }
            //LOOKS USELESS: animation._TotalKeyTime = totalInterpolationTime;

            // use the total interpolation time to resolve percent keytime keyframes
            for (i = 0; i < len; i++) {
                keyFrame = arr[i];
                keyTime = keyFrame.KeyTime;
                if (keyTime.HasPercent) {
                    keyFrame._ResolvedKeyTime = totalInterpolationTime.Multiply(keyTime.Percent)
                    keyFrame._Resolved = true;
                }
            }

            // if the last frame is KeyTime Uniform or Paced, resolve it to be equal to the total interpolation time
            if (len > 0) {
                keyFrame = arr[len - 1];
                keyTime = keyFrame.KeyTime;
                if (keyTime.IsPaced || keyTime.IsUniform) {
                    keyFrame._ResolvedKeyTime = totalInterpolationTime;
                    keyFrame._Resolved = true;
                }
            }

            /* if the first frame is KeyTime Paced:
            **   1. if there is only 1 frame, its KeyTime is the total interpolation time.
            **   2. if there is more than 1 frame, its KeyTime is 0.
            **
            ** note 1 is handled in the above block so we only have to
            ** handle 2 here.
            */
            if (len > 0) {
                keyFrame = arr[len - 1];
                keyTime = keyFrame.KeyTime;
                if (!keyFrame._Resolved && keyTime.IsPaced) {
                    keyFrame._ResolvedKeyTime = new TimeSpan();
                    keyFrame._Resolved = true;
                }
            }

            // XXX resolve remaining KeyTime::Uniform frames

            // XXX resolve frames with unspecified keytimes -- is this possible?  is the default keytime NULL?  it seems to be Uniform?

            // XXX resolve remaining KeyTime::Paced frames */

            return arr;
        }
    }
    Fayde.CoreLibrary.add(KeyFrame);

    export class KeyFrameCollection extends XamlObjectCollection<KeyFrame> {
        private _Resolved: boolean = false;
        private _SortedList: KeyFrame[] = [];

        GetKeyFrameForTime(t: TimeSpan, prevFrameRef: IOutValue): KeyFrame {
            var currentKeyFrame: KeyFrame = null;
            var previousKeyFrame: KeyFrame = null;
            var i;

            var sortedList = this._SortedList;

            if (sortedList.length == 0) {
                prevFrameRef.Value = null;
                return null;
            }

            var keyFrame: KeyFrame;
            var valuePropd;
            // Crawl forward to figure out what segment to use (this assumes the list is sorted)
            for (i = 0; i < sortedList.length; i++) {
                keyFrame = sortedList[i];
                if (keyFrame.CompareToTimeSpan(t) >= 0 || (i + 1) >= sortedList.length)
                    break;
            }

            // Crawl backward to find first non-null frame
            for (; i >= 0; i--) {
                keyFrame = sortedList[i];
                valuePropd = DependencyProperty.GetDependencyProperty((<any>keyFrame).constructor, "Value");
                if (keyFrame.GetValue(valuePropd) !== undefined) {
                    currentKeyFrame = keyFrame;
                    break;
                }
            }

            // Crawl backward some more to find first non-null prev frame
            for (i--; i >= 0; i--) {
                keyFrame = sortedList[i];
                valuePropd = DependencyProperty.GetDependencyProperty((<any>keyFrame).constructor, "Value");
                if (keyFrame.GetValue(valuePropd) !== undefined) {
                    previousKeyFrame = keyFrame;
                    break;
                }
            }

            prevFrameRef.Value = previousKeyFrame;
            return currentKeyFrame;
        }
        Clear(): boolean {
            this._Resolved = false;
            this._SortedList = [];
            return super.Clear();
        }

        AddingToCollection(value: KeyFrame, error: BError): boolean {
            if (!super.AddingToCollection(value, error))
                return false;
            this._Resolved = false;
            value.Listen(this);
            return true;
        }
        RemovedFromCollection(value: KeyFrame, isValueSafe: boolean) {
            super.RemovedFromCollection(value, isValueSafe);
            this._Resolved = false;
            value.Unlisten(this);
        }
        KeyFrameChanged(source: KeyFrame) {
            this._Resolved = false;
        }

        static ResolveKeyFrames(animation: AnimationBase, coll: KeyFrameCollection): KeyFrame[] {
            if (coll._Resolved)
                return coll._SortedList;
            coll._SortedList = KeyFrame.ResolveKeyFrames(animation, coll._ht).slice(0);
            coll._SortedList.sort(KeyFrame.Comparer);
            coll._Resolved = true;
            return coll._SortedList;
        }
    }
    Fayde.CoreLibrary.add(KeyFrameCollection);
}