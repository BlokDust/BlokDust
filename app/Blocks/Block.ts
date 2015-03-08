import IBlock = require("./IBlock");
import Grid = require("../Grid");
import Type = require("./BlockType");
import BlockType = Type.BlockType;
import Size = Fayde.Utils.Size;
import Particle = require("../Particle");
import DisplayObject = require("../DisplayObject");
import BlocksSketch = require("../BlocksSketch");
import ParametersPanel = require("../UI/ParametersPanel");

class Block extends DisplayObject implements IBlock {

    public Id: number;
    public Reference;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public Position: Point; // in grid units
    public LastPosition: Point; // in grid units
    public IsPressed: boolean = false;
    public IsSelected: boolean = false;
    public Grid: Grid;
    public Outline: Point[] = [];
    public ZIndex;
    public ParamJson;
    private _Duplicable: boolean = false;

    public BlockType: BlockType;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        if (!this.Position) throw new Exception("Position not specified for Block");

        this.Update();
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
        var p = this.Grid.GetRelativePoint(this.Position, new Point(x, y));
        p = this.GetTransformedPoint(p);
        this.Ctx.moveTo(p.x, p.y);
    }

    DrawLineTo(x, y) {
        var p = this.Grid.GetRelativePoint(this.Position, new Point(x, y));
        p = this.GetTransformedPoint(p);
        this.Ctx.lineTo(p.x, p.y);
    }

    // converts a point in grid units to absolute units and transforms it
    GetTransformedPoint(point: Point): Point {
        var p: Point = this.Grid.ConvertGridUnitsToAbsolute(point);
        return this.Grid.ConvertBaseToTransformed(p);
    }

    ParticleCollision(particle: Particle) {

    }

    MouseDown() {
        this.IsPressed = true;
        this.LastPosition = this.Position.Clone();
        this.Click.raise(this, new Fayde.RoutedEventArgs());
    }

    TouchDown() {
        this.IsPressed = true;
    }

    MouseUp() {
        this.IsPressed = false;
        this._Duplicable = true;
    }

    MouseMove(point: Point) {
        if (this.IsPressed){

            // ALT-DRAG COPY
            if (this.Grid.AltDown && this._Duplicable) {
                (<BlocksSketch>this.Grid).CreateBlockFromType(this.Reference);
                this.MouseUp();
            }
            // MOVE //
            else {
                point = this.Grid.ConvertTransformedToBase(point);
                point = this.Grid.SnapToGrid(point);
                point = this.Grid.ConvertAbsoluteToGridUnits(point);
                this.Position = point;
            }

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
        var p = this.Grid.ConvertGridUnitsToAbsolute(this.Position);
        return Math.distanceBetween(p.x, p.y, point.x, point.y);
    }

    OpenParams() {

    }

    SetValue(param: string,value: number) {

    }
    GetValue(param: string) {

    }
}

export = Block;