/// <reference path="../refs" />

import IBlock = require("./IBlock");
import BlocksView = require("../BlocksView");
import Size = Fayde.Utils.Size;

class Block implements IBlock {

    public Id: number;
    public IndexZ: number;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _Position: Point;
    private _LastPosition: Point;
    public IsPressed: boolean = false;
    private _IsSelected: boolean = false;
    Ctx: CanvasRenderingContext2D;
    private _CtxSize: Size;
    public Outline: Point[] = [];

    set Position(value: Point){
        this._Position = this._GetAbsGridPosition(value);
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
        ctx.globalAlpha = this.IsPressed && this.IsSelected ? 0.5 : 1;

        ctx.fillStyle = "#fff";
        var pos = this._GetRelGridPosition(new Point(-2, -2));
        ctx.fillText(""+this.IndexZ,pos.X,pos.Y);
    }

    // x and y are grid units. grid units are the divisor of the blocks view (1/50)
    // so if x = -1, that's (width/50)*-1
    DrawMoveTo(x, y) {
        this.Ctx.beginPath();
        var pos = this._GetRelGridPosition(new Point(x, y));
        this.Ctx.moveTo(pos.X, pos.Y);
    }

    DrawLineTo(x,y) {
        var pos = this._GetRelGridPosition(new Point(x, y));
        this.Ctx.lineTo(pos.X, pos.Y);
    }

    /*
    * @param {point} point - specifies number of units relative to AbsPosition. (-1, -1) means "one unit left and one unit up".
     */
    private _GetRelGridPosition(point: Point): Point {
        return new Point(this.AbsPosition.X + (this.Ctx.canvas.width/this.Ctx.divisor) * point.X, this.AbsPosition.Y + (this.Ctx.canvas.width/this.Ctx.divisor) * point.Y);
    }

    private _GetAbsGridPosition(point: Point): Point {
        var aspect = (this.Ctx.canvas.height/this.Ctx.canvas.width);
        var x = Math.round(point.X / (1/this.Ctx.divisor)) * (1/this.Ctx.divisor);
        var y = Math.round(point.Y / (1/(this.Ctx.divisor*aspect))) * (1/(this.Ctx.divisor*aspect));
        return new Point(x, y);
    }



    MouseDown() {
        this.IsPressed = true;
        this.LastPosition = this.Position.Clone();
        this.Click.Raise(this, new Fayde.RoutedEventArgs());
    }

    TouchDown() {
        this.IsPressed = true;
        //this.OnClick();
    }

    MouseUp() {
        this.IsPressed = false;
    }

    // relative point
    MouseMove(point: Point) {
        if (this.IsPressed){
            this.Position = point;
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