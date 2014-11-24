import IBlock = require("./IBlock");
import Grid = require("../Grid");
import Type = require("./BlockType");
import BlockType = Type.BlockType;
import Size = Fayde.Utils.Size;
//import Particle = require("../Particle");
import DisplayObject = require("../DisplayObject");

class Block extends DisplayObject implements IBlock {

    public Id: number;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _Position: Point;
    private _LastPosition: Point;
    public IsPressed: boolean = false;
    private _IsSelected: boolean = false;
    public Grid: Grid;
    public Outline: Point[] = [];
    public ZIndex;

    public BlockType: BlockType;

    get Ctx(): CanvasRenderingContext2D{
        return this.Grid.Ctx;
    }

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
    constructor(grid: Grid, position: Point) {
        super(grid.Ctx);

        this.Grid = grid;
        this.Position = this.Grid.GetGridPosition(position);
        this.Update();
    }

    // returns the Block's absolute position in pixels
    get AbsPosition(): Point {
        return this.Grid.GetAbsPosition(this.Position);
    }

    // todo: necessary to pass ctx to update and draw?
    Update() {

    }

    Draw() {
        this.Ctx.globalAlpha = this.IsPressed && this.IsSelected ? 0.5 : 1;

        if (window.debug){
            this.Ctx.fillStyle = "#fff";
            var pos = this.Grid.GetAbsPosition(this._GetRelGridPosition(new Point(-2, -2)));
            this.Ctx.fillText("" + this.ZIndex, pos.x, pos.y);
        }
    }

    // x and y are grid units. grid units are the divisor of the blocks view (1/50)
    // so if x = -1, that's (width/50)*-1
    DrawMoveTo(x, y) {
        var pos = this.Grid.GetAbsPosition(this._GetRelGridPosition(new Point(x, y)));
        this.Ctx.moveTo(pos.x, pos.y);
    }

    DrawLineTo(x,y) {
        var pos = this.Grid.GetAbsPosition(this._GetRelGridPosition(new Point(x, y)));
        this.Ctx.lineTo(pos.x, pos.y);
    }

    /*
    * @param {point} point - specifies number of units relative to Position. (-1, -1) means "one unit left and one unit up".
     */
    private _GetRelGridPosition(units: Point): Point {
        return new Point(
            this.Position.x + units.x,
            this.Position.y + units.y);
    }

    //ParticleCollision(particle: Particle) {
    //
    //}

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
            this.Position = this.Grid.GetGridPosition(point);
        }
    }

    // absolute point
    HitTest(point: Point):boolean {
        var ref = this.Outline;
        var i;

        this.Ctx.beginPath();
        this.DrawMoveTo(ref[0].x, ref[0].y);
        for (i=1;i<ref.length;i++) this.DrawLineTo(ref[i].x, ref[i].y);
        this.Ctx.closePath();

        return this.Ctx.isPointInPath(point.x, point.y);
    }

    // absolute point
    DistanceFrom(point: Point): number{
        return Math.distanceBetween(this.AbsPosition.x, this.AbsPosition.y, point.x, point.y);
    }

}

export = Block;