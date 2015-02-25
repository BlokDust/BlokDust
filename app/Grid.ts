import ScaleTransform = Fayde.Media.ScaleTransform;
import TranslateTransform = Fayde.Media.TranslateTransform;
import TransformGroup = Fayde.Media.TransformGroup;
import BlockSprites = require("./Blocks/BlockSprites");
import IBlock = require("./Blocks/IBlock");

class Grid extends Fayde.Drawing.SketchContext {

    // number of units to divide width by.
    public _Divisor: number;
    public ScaleToFit: boolean = false;
    private _InitialUnitWidth: number;
    public GridSize: number; // multiplier of Units to specify grid cell width
    public BlockSprites: BlockSprites;
    public TxtHeader: string;
    public TxtSlider: string;
    public TxtMid: string;
    public TxtBody: string;
    public TxtItalic: string;
    public TxtData: string;
    public AltDown: boolean = false;


    private _TransformGroup: TransformGroup;

    get Divisor(): number {
        if (!this.ScaleToFit){
            // the amount you need to divide the canvas width by in order to get the initial unit width
            return (1 / this._InitialUnitWidth) * this.Width;
        } else {
            return this._Divisor;
        }
    }

    set Divisor(value: number) {
        this._Divisor = value;

        if (!this.ScaleToFit){
            this._InitialUnitWidth = this.Width / this._Divisor;
        }
    }

    get TransformGroup(): TransformGroup {
        return this._TransformGroup;
    }

    set TransformGroup(value: TransformGroup) {
        this._TransformGroup = value;
    }

    get ScaleTransform(): ScaleTransform{
        if (!this.TransformGroup){
            var scaleTransform = new ScaleTransform();
            scaleTransform.ScaleX = 1;
            scaleTransform.ScaleY = 1;
            return scaleTransform;
        }
        return <ScaleTransform>this.TransformGroup.Children.GetValueAt(0);
    }

    get TranslateTransform(): TranslateTransform{
        if (!this.TransformGroup){
            var translateTransform = new TranslateTransform();
            translateTransform.X = 0;
            translateTransform.Y = 0;
            return translateTransform;
        }
        return <TranslateTransform>this.TransformGroup.Children.GetValueAt(1);
    }

    constructor() {
        super();

    }



    // GRID CELL SIZE //
    get CellWidth(): Size{
        var u = this.Unit.width * this.GridSize;
        return new Size(u, u);
    }
    // SINGLE GLOBAL UNIT //
    get Unit(): Size{
        var u = this.Width / this.Divisor;
        return new Size(u, u);
    }
    // SCALED GRID CELL SIZE //
    get ScaledCellWidth(): Size{
        var u = this.ScaledUnit.width * this.GridSize;
        return new Size(u, u);
    }
    // SCALED SINGLE GLOBAL UNIT //
    get ScaledUnit(): Size{
        var u = this.ScaledSize.width / this.Divisor;
        return new Size(u, u);
    }

    get ScaledSize(): Size {
        return new Size(this.Width * this.ScaleTransform.ScaleX, this.Height * this.ScaleTransform.ScaleY);
    }

    public GetRandomGridPosition(): Point{
        var p = new Point(Math.random() * this.Width, Math.random() * this.Height);
        p = this.SnapToGrid(p);
        return this.ConvertAbsoluteToGridUnits(p);
    }

    // BLOCK SNAPPING //
    public SnapToGrid(point: Point): Point {

        var grd = this.CellWidth.width;
        var x = Math.round((point.x)/grd)*grd;
        var y = Math.round((point.y)/grd)*grd;

        return new Point(x, y);
    }

    // convert a point in base coordinate space
    // into transformed coordinate space.
    public ConvertBaseToTransformed(point: Point): Point {

        point = point.Clone();

        point.x *= this.ScaleTransform.ScaleX;
        point.y *= this.ScaleTransform.ScaleY;

        point.x += this.TranslateTransform.X;
        point.y += this.TranslateTransform.Y;

        return point;
    }

    // convert a point in transformed coordinate space
    // into base coordinate space.
    public ConvertTransformedToBase(point: Point): Point {
        var x = Math.normalise(point.x, this.TranslateTransform.X, this.TranslateTransform.X + this.ScaledSize.width);
        var y = Math.normalise(point.y, this.TranslateTransform.Y, this.TranslateTransform.Y + this.ScaledSize.height);
        var p = new Point(x, y);
        return this.ConvertNormalisedToAbsolute(p);
    }

    public GetTransformedPoint(point: Point): Point {
        return this.ConvertBaseToTransformed(point);
    }

    public GetRelativePoint(point: Point, offset: Point): Point {
        return new Point(point.x + offset.x, point.y + offset.y);
    }

    public ConvertAbsoluteToNormalised(point: Point): Point {
        return new Point(Math.normalise(point.x, 0, this.Width), Math.normalise(point.y, 0, this.Height));
    }

    public ConvertNormalisedToAbsolute(point: Point): Point {
        return new Point(point.x * this.Width, point.y * this.Height);
    }

    public ConvertGridUnitsToAbsolute(point: Point): Point {
        return new Point(this.CellWidth.width * point.x, this.CellWidth.width * point.y);
    }

    public ConvertScaledGridUnitsToAbsolute(point: Point): Point {
        return new Point((this.ScaledCellWidth.width * point.x) + this.TranslateTransform.X, (this.ScaledCellWidth.width * point.y) + this.TranslateTransform.Y);
    }

    public ConvertAbsoluteToGridUnits(point: Point): Point {
        return new Point(point.x / this.CellWidth.width, point.y / this.CellWidth.width);
    }

    /*public GetHeightDivisor(): number {
        // the vertical divisor is the amount you need to divide the canvas height by in order to get the cell width
        // width  / 75 = 10
        // height / x  = 10
        // x = 1 / 10 * height
        return (1 / this.Unit.height) * this.Height;
    }*/

    // TEMP // TODO: Blocks should reference BlocksSketch instead of Grid, all Grid & BlocksSketch functions will then be accessible
    CreateBlockFromType<T extends IBlock>(m: {new(grid: Grid, position: Point): T; }) {

    }

    Draw() {
        // draw grid
        /*if (window.debug) {
            var startPoint: Point;
            var endPoint: Point;
            var cellWidth = this.CellWidth.width;

            this.Ctx.lineWidth = 1;
            this.Ctx.strokeStyle = '#3d3256';

            // rows
            for (var j = 0; j < (this.Height/cellWidth); j++) {
                var y = Math.round(cellWidth * j);
                this.Ctx.beginPath();
                startPoint = this.GetTransformedPoint(new Point(0, y));
                this.Ctx.moveTo(startPoint.x, startPoint.y);
                endPoint = this.SnapToGrid(new Point(this.Width, y));
                endPoint = this.GetTransformedPoint(endPoint);
                this.Ctx.lineTo(endPoint.x, endPoint.y);
                this.Ctx.stroke();
                this.Ctx.closePath();
            }

            // cols
            for (var i = 0; i < (this.Width/cellWidth); i++) {
                var x = Math.round(cellWidth * i);
                this.Ctx.beginPath();
                startPoint = this.GetTransformedPoint(new Point(x, 0));
                this.Ctx.moveTo(startPoint.x, startPoint.y);
                endPoint = this.SnapToGrid(new Point(x, this.Height));
                endPoint = this.GetTransformedPoint(endPoint);
                this.Ctx.lineTo(endPoint.x, endPoint.y);
                this.Ctx.stroke();
                this.Ctx.closePath();
            }
        }*/
    }
}

export = Grid;