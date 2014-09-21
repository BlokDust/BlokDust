/// <reference path="./refs" />

class Block {

    public Id: number;
    private _Osc: Tone.Oscillator;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _Position: Point;
    private _Radius: number = 20;
    private _IsPressed: boolean = false;

    constructor(id: number, x: number, y: number){
        this.Id = id;
        this._Position = new Point(x, y);
        this._Osc = new Tone.Oscillator(440, "sine");

//        var vibrato = new Tone.LFO(6, -25, 25);
//        vibrato.start();
//
        this._Osc.toMaster();
        this._Osc.setVolume(-10);
//        vibrato.connect(this._Osc.detune);
    }

    Draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this._Position.X, this._Position.Y, this._Radius, 0, Math.TAU, false);
        ctx.fillStyle = this._IsPressed ? "#BBB" : "#000";
        ctx.fill();
    }

    _StartSound(){
        this._Osc.start();
    }

    _StopSound(){
        this._Osc.stop();
    }

    MouseDown() {
        this._StartSound();
        this._IsPressed = true;
        this.Click.Raise(this, new Fayde.RoutedEventArgs());
    }

    MouseUp() {
        this._IsPressed = false;
        this._StopSound();
    }

    MouseMove(point: Point){
        if (this._IsPressed){
            this._Position = point;
        }
    }

    HitTest(point: Point): boolean{
        var distance = Math.distanceBetween(this._Position.X, this._Position.Y, point.X, point.Y);

        if (distance <= this._Radius){
            this.MouseDown();
            return true;
        }
        
        return false;
    }
}

export = Block;