/// <reference path="../refs" />

import IBlock = require("./IBlock");
import Size = Fayde.Utils.Size;

class Block implements IBlock {

    public Id: number;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _Position: Point;
    public Radius: number = 20;
    public IsPressed: boolean = false;
    public IsSelected: boolean = false;
    Ctx: CanvasRenderingContext2D;
    private _CtxSize: Size = new Size(0, 0);

    // normalised point
    constructor(ctx: CanvasRenderingContext2D, position: Point) {
        this.Ctx = ctx;
        this._Position = position;
    }

    // returns the Block's absolute position
    get Position(): Point {
        return new Point(this._Position.X * this._CtxSize.Width, this._Position.Y * this._CtxSize.Height);
    }

    Update(ctx: CanvasRenderingContext2D) {
        // only recreate the _CtxSize object if the ctx size has changed.
        if (this.Ctx.canvas.width != this._CtxSize.Width || this.Ctx.canvas.height != this._CtxSize.Height){
            this._CtxSize = new Size(ctx.canvas.width, ctx.canvas.height);
        }
    }

    Draw(ctx: CanvasRenderingContext2D) {

    }

    MouseDown() {
        this.IsPressed = true;
        this.Click.Raise(this, new Fayde.RoutedEventArgs());
    }

    MouseUp() {
        this.IsPressed = false;
    }

    // relative point
    MouseMove(point: Point) {
        if (this.IsPressed) {
            this._Position = point;
        }
    }

    // absolute point
    HitTest(point: Point):boolean {
        var distance = this.DistanceFrom(point);

        if (distance <= this.Radius) {
            this.MouseDown();
            return true;
        }

        return false;
    }

    // absolute point
    DistanceFrom(point: Point): number{
        return Math.distanceBetween(this.Position.X, this.Position.Y, point.X, point.Y);
    }
}

export = Block;