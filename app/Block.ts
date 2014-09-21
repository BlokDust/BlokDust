/// <reference path="./refs" />

class Block {

    public Id: number;
    private _Osc: Tone.Oscillator;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _Position: Point;
    private _Radius: number = 20;

    constructor(index: number, x: number, y: number){
        this.Id = index;
        this._Position = new Point(x, y);
        this._Osc = new Tone.Oscillator(440, "sine");

        var vibrato = new Tone.LFO(6, -25, 25);
        vibrato.start();

        this._Osc.toMaster();
        this._Osc.setVolume(-10);
        vibrato.connect(this._Osc.detune);
    }

    Draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this._Position.X, this._Position.Y, this._Radius, 0, Math.TAU, false);
        ctx.fillStyle = "#000";
        ctx.fill();
    }

    _StartSound(){
        this._Osc.start();
    }

    _StopSound(){
        this._Osc.stop();
    }

    OnClick(){
        this.Click.Raise(this, new Fayde.RoutedEventArgs());
    }

    MouseDown(point: Point) {
        if (this._Collides(point)){
            this._StartSound();
            this.OnClick();
        }
    }

    MouseUp(point: Point) {
        this._StopSound();
    }

    _Collides(point: Point): boolean{
        var distance = Math.distanceBetween(this._Position.X, this._Position.Y, point.X, point.Y);
        return distance <= this._Radius;
    }
}

export = Block;