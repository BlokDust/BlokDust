module Fayde.Media.Animation {
    export class RepeatBehavior {
        private _Duration: Duration = null;
        private _Count: number = null;
        IsForever: boolean = false;

        static FromRepeatDuration(duration: Duration): RepeatBehavior {
            var rb = new RepeatBehavior();
            rb._Duration = duration;
            return rb;
        }
        static FromIterationCount(count: number): RepeatBehavior {
            var rb = new RepeatBehavior();
            rb._Count = count;
            return rb;
        }

        get HasCount(): boolean { return this._Count != null; }
        get Count(): number { return this._Count; }

        get HasDuration(): boolean { return this._Duration != null; }
        get Duration(): Duration { return this._Duration; }

        Clone(): RepeatBehavior {
            var rb = new RepeatBehavior();
            rb._Duration = this._Duration;
            rb._Count = this._Count;
            rb.IsForever = this.IsForever;
            return rb;
        }

        static Forever: RepeatBehavior = (function () { var rb = new RepeatBehavior(); rb.IsForever = true; return rb; })();
    }
    Fayde.CoreLibrary.add(RepeatBehavior);

    nullstone.registerTypeConverter(RepeatBehavior, (val: string): RepeatBehavior => {
        if (!val || val.toLowerCase() === "forever")
            return RepeatBehavior.Forever;
        if (val[val.length - 1] === "x") {
            var d = parseInt(val.substr(0, val.length - 1));
            return RepeatBehavior.FromIterationCount(d);
        }
        var duration = new Duration(nullstone.convertAnyToType(val, TimeSpan));
        return RepeatBehavior.FromRepeatDuration(duration);
    });
}