/// <reference path="../../Core/DependencyObject.ts" />
/// <reference path="../../Core/XamlObjectCollection.ts" />
/// <reference path="Enums.ts" />
/// <reference path="RepeatBehavior.ts" />

module Fayde.Media.Animation {
    export interface IClockData {
        CurrentTime: TimeSpan;
        Progress: number;
        Completed: boolean;
    }

    export class Timeline extends DependencyObject implements ITimeline {
        static DEFAULT_REPEAT_BEHAVIOR: RepeatBehavior = RepeatBehavior.FromIterationCount(1);
        static AutoReverseProperty = DependencyProperty.Register("AutoReverse", () => Boolean, Timeline, false);
        static BeginTimeProperty = DependencyProperty.Register("BeginTime", () => TimeSpan, Timeline);
        static DurationProperty = DependencyProperty.Register("Duration", () => Duration, Timeline);
        static RepeatBehaviorProperty = DependencyProperty.Register("RepeatBehavior", () => RepeatBehavior, Timeline);
        static SpeedRatioProperty = DependencyProperty.Register("SpeedRatio", () => Number, Timeline, 1.0);
        static FillBehaviorProperty = DependencyProperty.Register("FillBehavior", () => new Enum(FillBehavior), Timeline, FillBehavior.HoldEnd);
        AutoReverse: boolean;
        BeginTime: TimeSpan;
        Duration: Duration; //Treat undefined as Automatic
        RepeatBehavior: RepeatBehavior; //Treat undefined as IterationCount -> 1
        SpeedRatio: number;
        FillBehavior: FillBehavior;

        Completed = new nullstone.Event();

        private _IsPaused: boolean = false;
        private _BeginPauseTime: number = 0;
        private _TicksPaused: number = 0;
        private _IsFirstUpdate: boolean = true;
        private _HasBegun: boolean = false;
        private _BeginTicks: number = undefined;
        private _InitialStep: number = undefined;
        private _HasCompleted: boolean = false;

        ManualTarget: DependencyObject = undefined;

        get HasManualTarget (): boolean {
            return this.ManualTarget !== undefined;
        }

        Reset () {
            this._TicksPaused = 0;
            this._IsFirstUpdate = true;
            this._BeginTicks = undefined;
            this._HasBegun = false;
            this._HasCompleted = false;
        }

        Pause () {
            if (this._IsPaused)
                return;
            this._BeginPauseTime = new Date().getTime();
            this._IsPaused = true;
        }

        Resume () {
            if (!this._IsPaused)
                return;
            this._IsPaused = false;
            var nowTime = new Date().getTime();
            this._TicksPaused = nowTime - this._BeginPauseTime;
        }

        Stop () {
            this.Reset();
        }

        OnCompleted () {
            this._HasCompleted = true;
            var fill = this.FillBehavior;
            switch (fill) {
                case FillBehavior.HoldEnd:
                    this.HoldEnd();
                    break;
                case FillBehavior.Stop:
                    this.Stop();
                    break;
            }
            this.Completed.raise(this, null);
        }

        Update (nowTime: number) {
            var clockData = this.CreateClockData(nowTime);
            if (!clockData || this._IsPaused || this._HasCompleted)
                return;
            this.UpdateInternal(clockData);
            if (clockData.Completed)
                this.OnCompleted();
        }

        UpdateInternal (clockData: IClockData) {
        }

        HoldEnd () {
        }

        private CreateClockData (nowTime: number): IClockData {
            if (this._IsFirstUpdate) {
                this._InitialStep = nowTime;
                this._HasBegun = false;
                this._IsFirstUpdate = false;
            }
            if (!this._HasBegun) {
                if (!this.IsAfterBeginTime(nowTime))
                    return null;
                this._BeginTicks = nowTime;
                this._HasBegun = true;
            }

            var elapsedTicks = nowTime - this._BeginTicks - this._TicksPaused;
            var currentTimeTicks = elapsedTicks;
            var progress = 0.0;
            var completed = false;

            var duration = this.GetNaturalDuration();
            if (duration.IsAutomatic) {
                progress = 1.0;
                completed = true;
            } else if (duration.HasTimeSpan) {
                var d = duration.TimeSpan.Ticks;
                if (d === 0) {
                    progress = 1.0;
                } else if (this.AutoReverse === true) {
                    d = d / 2;
                    // Progress - Graph that repeats 3 times has shape: /\/\/\/\/\/\
                    progress = 1 - (Math.abs((elapsedTicks % (d + d)) - d) / d);
                } else {
                    // Progress - Graph that repeats 3 times has shape: //////
                    progress = (elapsedTicks / d) - Math.floor(elapsedTicks / d);
                }

                var repeat = this.RepeatBehavior || Timeline.DEFAULT_REPEAT_BEHAVIOR;
                if (repeat.IsForever) {
                } else if (repeat.HasCount) {
                    if ((d === 0) || (Math.floor(elapsedTicks / d) >= repeat.Count)) {
                        progress = 1.0;
                        completed = true;
                    }
                } else if (repeat.HasDuration) {
                    if (elapsedTicks >= repeat.Duration.TimeSpan.Ticks) {
                        progress = 1.0;
                        completed = true;
                    }
                }

                if (d !== 0)
                    currentTimeTicks = progress * d; //normalizes CurrentTime within [0,duration] constraints
            }
            // else if (duration.IsForever) { // do nothing }

            return {
                CurrentTime: new TimeSpan(currentTimeTicks),
                Progress: progress,
                Completed: completed
            };
        }

        private IsAfterBeginTime (nowTime: number): boolean {
            var beginTime = this.BeginTime;
            if (beginTime == null)
                return true;
            var beginTicks = beginTime.Ticks;
            if (beginTicks <= 0)
                return true;
            var elapsedTicks = nowTime - this._InitialStep;
            if (elapsedTicks < beginTicks)
                return false;
            return true;
        }

        GetNaturalDuration (): Duration {
            var d = this.Duration;
            if (!d || d.IsAutomatic)
                return this.GetNaturalDurationCore();
            return d;
        }

        GetNaturalDurationCore (): Duration {
            return Duration.Automatic;
        }

        GenerateFrom (): AnimationBase {
            return undefined;
        }

        GenerateTo (isEntering: boolean): AnimationBase {
            return undefined;
        }
    }
    Fayde.CoreLibrary.add(Timeline);

    export class TimelineCollection extends XamlObjectCollection<Timeline> {
    }
    Fayde.CoreLibrary.add(TimelineCollection);
}