/// <reference path="./refs" />

import SketchContext = require("./SketchContext");
import Vector = Fayde.Utils.Vector;

class Blocks extends SketchContext {

    private _Position: Vector;
    private _Velocity: Vector;
    public Collision: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();

    constructor() {
        super();
        this._Position = new Vector(100, 100);
        this._Velocity = new Vector(2.5, 5);
    }

    Draw(){
        super.Draw();

        this.Ctx.fillStyle = "#d7d7d7";
        this.Ctx.fillRect(0, 0, this.Width, this.Height);

        this._Position.Add(this._Velocity);

        if ((this._Position.X > this.Width) || (this._Position.X < 0)) {
            this._Velocity.X = this._Velocity.X * -1;
            this.OnCollision();
        }

        if ((this._Position.Y > this.Height) || (this._Position.Y < 0)) {
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