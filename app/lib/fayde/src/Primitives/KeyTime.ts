class KeyTime implements ICloneable {
    private _IsPaced: boolean = false;
    private _IsUniform: boolean = false;
    private _TimeSpan: TimeSpan = null;
    private _Percent: number = null;
    IsValid: boolean = true;

    static CreateUniform(): KeyTime {
        var kt = new KeyTime();
        kt._IsUniform = true;
        return kt;
    }
    static CreateTimeSpan(ts: TimeSpan): KeyTime {
        var kt = new KeyTime();
        kt._TimeSpan = ts;
        return kt;
    }

    Clone(): KeyTime {
        var kt = new KeyTime();
        kt._TimeSpan = this._TimeSpan;
        kt._IsPaced = this._IsPaced;
        kt._IsUniform = this._IsUniform;
        kt._Percent = this._Percent;
        return kt;
    }

    get IsPaced(): boolean { return this._IsPaced; }
    get IsUniform(): boolean { return this._IsUniform; }
    get HasTimeSpan(): boolean { return this._TimeSpan != null; }
    get TimeSpan(): TimeSpan { return this._TimeSpan; }
    get HasPercent(): boolean { return this._Percent != null; }
    get Percent(): number { return this._Percent; }
}
Fayde.CoreLibrary.addPrimitive(KeyTime);
nullstone.registerTypeConverter(KeyTime, (val: any): KeyTime => {
    if (!val || val.toString().toLowerCase() === "uniform")
        return KeyTime.CreateUniform();
    var ts = nullstone.convertAnyToType(val, TimeSpan);
    return KeyTime.CreateTimeSpan(ts);
});