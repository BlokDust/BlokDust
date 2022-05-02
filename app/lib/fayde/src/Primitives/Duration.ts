enum DurationType {
    Automatic = 0,
    Forever = 1,
    TimeSpan = 2,
}

class Duration implements ICloneable {
    private _Type: DurationType = DurationType.TimeSpan;
    private _TimeSpan: TimeSpan;

    constructor(ts?: TimeSpan) {
        this._TimeSpan = ts;
    }

    Clone(): Duration {
        var dur = new Duration();
        dur._Type = this._Type;
        dur._TimeSpan = this._TimeSpan;
        return dur;
    }

    get Type(): DurationType { return this._Type; }
    get TimeSpan(): TimeSpan {
        if (this._Type === DurationType.TimeSpan)
            return this._TimeSpan;
    }
    get HasTimeSpan(): boolean { return this._Type === DurationType.TimeSpan }
    get IsForever(): boolean { return this._Type === DurationType.Forever; }
    get IsAutomatic(): boolean { return this._Type === DurationType.Automatic; }

    get IsZero(): boolean { return this._Type === DurationType.TimeSpan && this._TimeSpan.Ticks === 0; }

    static Automatic: Duration = (function () { var d = new Duration(); (<any>d)._Type = DurationType.Automatic; return d; })();
    static Forever: Duration = (function () { var d = new Duration(); (<any>d)._Type = DurationType.Forever; return d; })();
}
Fayde.CoreLibrary.addPrimitive(Duration);
nullstone.registerTypeConverter(Duration, (val: any): Duration => {
    if (val instanceof Duration)
	return <Duration>val;
    if (!val || val.toString().toLowerCase() === "automatic")
        return Duration.Automatic;
    if (val.toString().toLowerCase() === "forever")
        return Duration.Forever;
    var ts = nullstone.convertAnyToType(val, TimeSpan);
    return new Duration(ts);
});
