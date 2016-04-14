export class SignalToValue {

    private _Value: number;
    public Signal: Tone.Signal;
    private _Meter: Tone.Meter;

    private _Channels: number;
    private _Smoothing: number;
    private _ClipMemory: number;

    // This works as a clunky way to modulate pitch for a player/buffer (playbackRate).
    // Detune has been added to AudioBufferSourceNode in the new Web Audio API spec, in the same way OscillatorNode has. If that gets implemented switch to that.
    // It's clunky because it comes out of signal processing and back into our javascript framerate to update playbackRate, so fast modulations get skipped.

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
            this._Value = (meter - 1) * 2;
        }
        return this._Value;
    }
}
