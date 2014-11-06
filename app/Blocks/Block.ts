/// <reference path="../refs" />

import IBlock = require("./IBlock");
import BlocksView = require("../BlocksView");
import Size = Fayde.Utils.Size;

class Block implements IBlock {

    public Id: number;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _Position: Point;
    private _LastPosition: Point;
    public IsPressed: boolean = false;
    private _IsSelected: boolean = false;
    Ctx: CanvasRenderingContext2D;
    private _CtxSize: Size;
    public Outline: Point[] = [];
    public ZIndex;

    // value is a grid position.
    set Position(value: Point){
        this._Position = value;
    }

    get Position(): Point{
        return this._Position;
    }

    set LastPosition(value: Point){
        this._LastPosition = value;
    }

    get LastPosition(): Point{
        return this._LastPosition;
    }

    set IsSelected(value: boolean){
        this._IsSelected = value;
    }

    get IsSelected(): boolean {
        return this._IsSelected;
    }

    // normalised point
    constructor(ctx: CanvasRenderingContext2D, position: Point) {
        this.Ctx = ctx;
        this.Position = this._GetGridPosition(position);
        this.Update(ctx);
    }

    // returns the Block's absolute position in pixels
    get AbsPosition(): Point {
        return this._GetAbsPosition(this.Position);
    }

    get Unit(): Size{
        var u = this.Ctx.canvas.width / this.Ctx.divisor;
        return new Size(u, u);
    }

    Update(ctx: CanvasRenderingContext2D) {
        // only recreate the _CtxSize object if the ctx size has changed.
        if (!this._CtxSize || this.Ctx.canvas.width != this._CtxSize.Width || this.Ctx.canvas.height != this._CtxSize.Height){
            this._CtxSize = new Size(ctx.canvas.width, ctx.canvas.height);
        }
    }

    Draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = this.IsPressed && this.IsSelected ? 0.5 : 1;

        if (window.debug){
            ctx.fillStyle = "#fff";
            var pos = this._GetAbsPosition(this._GetRelGridPosition(new Point(-2, -2)));
            ctx.fillText(""+this.ZIndex,pos.X,pos.Y);
        }
    }

    // x and y are grid units. grid units are the divisor of the blocks view (1/50)
    // so if x = -1, that's (width/50)*-1
    DrawMoveTo(x, y) {
        this.Ctx.beginPath();
        var pos = this._GetAbsPosition(this._GetRelGridPosition(new Point(x, y)));
        this.Ctx.moveTo(pos.X, pos.Y);
    }

    DrawLineTo(x,y) {
        var pos = this._GetAbsPosition(this._GetRelGridPosition(new Point(x, y)));
        this.Ctx.lineTo(pos.X, pos.Y);
    }

    /*
    * @param {point} point - specifies number of units relative to Position. (-1, -1) means "one unit left and one unit up".
     */
    private _GetRelGridPosition(units: Point): Point {
        return new Point(
            this.Position.X + units.X,
            this.Position.Y + units.Y);
    }

    // rounds the normalised position to nearest grid intersection in grid units.
    private _GetGridPosition(point: Point): Point {
        var x = Math.round(point.X * this.Ctx.divisor);// / this.Ctx.divisor;

        // the vertical divisor is the amount you need to divide the canvas height by in order to get the cell width

        // width  / 75 = 10
        // height / x  = 10
        // x = 1 / 10 * height

        var y = Math.round(point.Y * this._GetHeightDivisor());// / divisor;
        return new Point(x, y);
    }

    // get position in pixels.
    private _GetAbsPosition(position: Point): Point {
        var x = (position.X / this.Ctx.divisor) * this.Ctx.canvas.width;
        var y = (position.Y / this._GetHeightDivisor()) * this.Ctx.canvas.height;
        return new Point(x, y);
    }

    private _GetHeightDivisor(): number {
        return (1 / this.Unit.Height) * this.Ctx.canvas.height;
    }

    MouseDown() {
        this.IsPressed = true;
        this.LastPosition = this.Position.Clone();
        this.Click.Raise(this, new Fayde.RoutedEventArgs());
    }

    TouchDown() {
        this.IsPressed = true;
    }

    MouseUp() {
        this.IsPressed = false;
    }

    // normalised point
    MouseMove(point: Point) {
        if (this.IsPressed){
            this.Position = this._GetGridPosition(point);
        }
    }

    // absolute point
    HitTest(point: Point):boolean {
        var ref = this.Outline;
        var i;

        this.DrawMoveTo(ref[0].X,ref[0].Y);
        for (i=1;i<ref.length;i++) this.DrawLineTo(ref[i].X, ref[i].Y);
        this.Ctx.closePath();

        return this.Ctx.isPointInPath(point.X,point.Y);
    }

    // absolute point
    DistanceFrom(point: Point): number{
        return Math.distanceBetween(this.AbsPosition.X, this.AbsPosition.Y, point.X, point.Y);
    }

}

export = Block;