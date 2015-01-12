import IBlock = require("./IBlock");
import Grid = require("../Grid");
import Type = require("./BlockType");
import BlockType = Type.BlockType;
import Size = Fayde.Utils.Size;
import Particle = require("../Particle");
import DisplayObject = require("../DisplayObject");
import BlocksSketch = require("../BlocksSketch");
import ParametersPanel = require("../ParametersPanel");

class Block extends DisplayObject implements IBlock {

    public Id: number;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public GridPosition: Point;
    public LastGridPosition: Point;
    public IsPressed: boolean = false;
    public IsSelected: boolean = false;
    public Grid: Grid;
    public Outline: Point[] = [];
    public ZIndex;
    public ParamJson;


    public BlockType: BlockType;

    // position: normalised point
    constructor(grid: Grid, position: Point) {
        super(grid.Ctx);

        this.Grid = grid;
        //this.ParamsPanel = this.Grid.SelectedBlock();
        this.GridPosition = this.Grid.GetGridPosition(position);
        this.Update();
    }

    // returns the Block's absolute position in pixels
    get Position(): Point {
        return this.Grid.GetAbsPosition(this.GridPosition);
    }

    Update() {

    }

    Draw() {
        super.Draw();

        //if (this.IsRenderCached) return;

        this.Ctx.globalAlpha = this.IsPressed && this.IsSelected ? 0.5 : 1;

        /*if (window.debug){
            this.Ctx.fillStyle = "#fff";
            var pos = this.Grid.GetAbsPosition(this._GetRelGridPosition(new Point(-2, -2)));
            this.Ctx.fillText("" + this.ZIndex, pos.x, pos.y);
        }*/
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
            this.GridPosition.x + units.x,
            this.GridPosition.y + units.y);
    }

    ParticleCollision(particle: Particle) {

    }

    MouseDown() {
        this.IsPressed = true;
        this.LastGridPosition = this.GridPosition.Clone();
        this.Click.raise(this, new Fayde.RoutedEventArgs());
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
            this.GridPosition = this.Grid.GetGridPosition(point);
        }
    }

    Delete() {}

    // absolute point
    HitTest(point: Point): boolean {

        this.Ctx.beginPath();
        this.DrawMoveTo(this.Outline[0].x, this.Outline[0].y);

        for (var i = 1; i < this.Outline.length; i++) {
            this.DrawLineTo(this.Outline[i].x, this.Outline[i].y);
        }

        this.Ctx.closePath();

        return this.Ctx.isPointInPath(point.x, point.y);
    }

    // absolute point
    DistanceFrom(point: Point): number{
        return Math.distanceBetween(this.Position.x, this.Position.y, point.x, point.y);
    }

    OpenParams() {

    }

}

export = Block;