import ScaleTransform = Fayde.Media.ScaleTransform;
import TranslateTransform = Fayde.Media.TranslateTransform;
import TransformGroup = Fayde.Media.TransformGroup;

class Grid extends Fayde.Drawing.SketchContext {

    // number of units to divide width by.
    public _Divisor: number;
    public ScaleToFit: boolean = false;
    private _InitialUnitWidth: number;

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

    get Unit(): Size{
        var u = this.Width / this.Divisor;
        return new Size(u, u);
    }

    get RenderUnit(): Size{
        var u = this.RenderSize.width / this.Divisor;
        return new Size(u, u);
    }

    get RenderSize(): Size {
        return new Size(this.Width * this.ScaleTransform.ScaleX, this.Height * this.ScaleTransform.ScaleY);
    }

    public GetRandomGridPosition(): Point{
        var p = new Point(Math.random() * this.Width, Math.random() * this.Height);
        p = this.SnapToGrid(p);
        return this.ConvertAbsoluteToGridUnits(p);
    }

    // round absolute point to align with grid intersection
    // returns an absolute pixel value
    public SnapToGrid(point: Point): Point {
        point = this.ConvertAbsoluteToNormalised(point);
        var col = Math.round(point.x * this.Divisor);
        var row = Math.round(point.y * this.GetHeightDivisor());

        // we now have the grid col and row.
        // convert them into absolute pixel values.

        var x = (col * this.Width) / this.Divisor;
        var y = (row * this.Height) / this.GetHeightDivisor();

        return new Point(x, y);
    }

    // convert a point in original coordinate space
    // into transformed coordinate space.
    public ConvertBaseToTransformed(point: Point): Point {

        point = point.Clone();

        point.x *= this.ScaleTransform.ScaleX;
        point.y *= this.ScaleTransform.ScaleY;

        point.x += this.TranslateTransform.X;
        point.y += this.TranslateTransform.Y;

        return point;
    }

    // pass an absolute point to get a normalised point in the transformed coordinate space.
    public ConvertTransformedToBase(point: Point): Point {
        var x = Math.normalise(point.x, this.TranslateTransform.X, this.TranslateTransform.X + this.RenderSize.width);
        var y = Math.normalise(point.y, this.TranslateTransform.Y, this.TranslateTransform.Y + this.RenderSize.height);
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
        return new Point(this.Unit.width * point.x, this.Unit.height * point.y);
    }

    public ConvertAbsoluteToGridUnits(point: Point): Point {
        return new Point(point.x / this.Unit.width, point.y / this.Unit.width);
    }

    public GetHeightDivisor(): number {
        // the vertical divisor is the amount you need to divide the canvas height by in order to get the cell width
        // width  / 75 = 10
        // height / x  = 10
        // x = 1 / 10 * height
        return (1 / this.Unit.height) * this.Height;
    }

    Draw() {
        // draw grid
        if (window.debug) {
            var startPoint: Point;
            var endPoint: Point;
            var cellWidth = this.Width / this.Divisor;

            this.Ctx.lineWidth = 1;
            this.Ctx.strokeStyle = '#3d3256';

            // rows
            for (var j = 0; j < this.GetHeightDivisor(); j++) {
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
            for (var i = 0; i < this.Divisor; i++) {
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
        }
    }
}

export = Grid;