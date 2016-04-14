export class SignalToValue {

    private _Value: number;
    public Signal: Tone.Signal;
    private _Meter: Tone.Meter;
    public Settings: {};

    private _Channels: number;
    private _Smoothing: number;
    private _ClipMemory: number;

    constructor() {

        this._Channels = 1;
        this._Smoothing = 0;
        this._ClipMemory = 0;


        this._Value = 0;
        this.Signal = new Tone.Signal();
        this._Meter = new Tone.Meter(this._Channels,this._Smoothing,this._ClipMemory);
        this.Signal.connect(this._Meter);
    }

    UpdateValue() {
        var meter: number = this._Meter.getValue();
        if (meter === 0) {
            this._Value = 0;
        } else {
            this._Value = this.ValueInRange((meter - 1) * 2,-1,1);
        }
        return this._Value;
    }

    get Value(): number {
        return this._Value;
    }

    ValueInRange(value,floor,ceiling) {
        /*if (value < floor) {
            value = floor;
        }
        if (value> ceiling) {
            value = ceiling;
        }*/
        return value;
    }

}
