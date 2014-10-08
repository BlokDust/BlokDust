/// <reference path="../refs" />

import IBlock = require("./IBlock");
import Size = Fayde.Utils.Size;

class Block implements IBlock {

    public Id: number;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public Position: Point;
    public LastPosition: Point;
    public Radius: number = 20;
    public IsPressed: boolean = false;
    private _IsSelected: boolean = false;
    public IsSticky: boolean = false;
    Ctx: CanvasRenderingContext2D;
    private _CtxSize: Size;

    set IsSelected(value: boolean){
        this._IsSelected = value;

        // store position for move undo
        if (this._IsSelected) {
            this.LastPosition = new Point(this.Position.X, this.Position.Y);
        }
    }

    get IsSelected(): boolean {
        return this._IsSelected;
    }

    // normalised point
    constructor(ctx: CanvasRenderingContext2D, position: Point) {
        this.Ctx = ctx;
        this.Position = position;
        this.Update(ctx);
    }

    // returns the Block's absolute position
    get AbsPosition(): Point {
        return new Point(this.Position.X * this._CtxSize.Width, this.Position.Y * this._CtxSize.Height);
    }

    Update(ctx: CanvasRenderingContext2D) {
        // only recreate the _CtxSize object if the ctx size has changed.
        if (!this._CtxSize || this.Ctx.canvas.width != this._CtxSize.Width || this.Ctx.canvas.height != this._CtxSize.Height){
            this._CtxSize = new Size(ctx.canvas.width, ctx.canvas.height);
        }
    }

    Draw(ctx: CanvasRenderingContext2D) {

    }

    MouseDown() {
        this.IsPressed = true;
        this.OnClick();
    }

    TouchDown() {
        this.IsPressed = true;
        this.OnClick();
    }

    MouseUp() {
        this.IsPressed = false;

        if (!this.IsSticky) {
            this.IsSelected = false;
        }
    }

    // relative point
    MouseMove(point: Point) {
        if ((!this.IsSticky && this.IsPressed) || (this.IsSticky && this.IsSelected)) {
            this.Position = point;
        }
    }

    OnClick() {
        // if the block is 'sticky', clicking it toggles the IsSelected property.
        //if (this.IsSticky){
            this.IsSelected = !this.IsSelected;
        //} else {
        //    this.IsSelected = true;
        //}

        this.Click.Raise(this, new Fayde.RoutedEventArgs());
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
        return Math.distanceBetween(this.AbsPosition.X, this.AbsPosition.Y, point.X, point.Y);
    }
}

export = Block;