/// <reference path="./refs" />

import Vector = Fayde.Utils.Vector;

class Blocks {

    public Ctx: CanvasRenderingContext2D;
    private _Position: Vector;
    private _Velocity: Vector;
    public Collision: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();

    constructor() {
        this._Position = new Vector(100, 100);
        this._Velocity = new Vector(2.5, 5);
    }

    Draw(){
        var width = this.Ctx.canvas.width;
        var height = this.Ctx.canvas.height;

        this.Ctx.fillStyle = "#d7d7d7";
        this.Ctx.fillRect(0, 0, width, height);

        this._Position.Add(this._Velocity);

        if ((this._Position.X > width) || (this._Position.X < 0)) {
            this._Velocity.X = this._Velocity.X * -1;
            this.OnCollision();
        }

        if ((this._Position.Y > height) || (this._Position.Y < 0)) {
            this._Velocity.Y = this._Velocity.Y * -1;
            this.OnCollision();
        }

        this.Ctx.beginPath();
        this.Ctx.arc(this._Position.X, this._Position.Y, 20, 0, Math.TAU, false);
        this.Ctx.fillStyle = "#000";
        this.Ctx.fill();
    }

    OnCollision(){
        this.Collision.Raise(this, new Fayde.RoutedEventArgs());
    }
}

export = Blocks;