
import ScaleTransform = Fayde.Media.ScaleTransform;
import TranslateTransform = Fayde.Media.TranslateTransform;
import TransformGroup = Fayde.Media.TransformGroup;

class Grid extends Fayde.Drawing.SketchContext {

    // number of units to divide width by.
    public Divisor: number;

    private _TransformGroup: TransformGroup;

    get TransformGroup(): TransformGroup {
        return this._TransformGroup;
    }

    set TransformGroup(value: TransformGroup) {
        this._TransformGroup = value;
    }

    constructor() {
        super();
    }

    get Unit(): Size{
        var u = this.Width / this.Divisor;
        return new Size(u, u);
    }

    public GetRandomGridPosition(): Point{
        var p = new Point(Math.random() * this.Width, Math.random() * this.Height);
        p = this.SnapToGrid(p);
        return this.ConvertAbsoluteToGridUnits(p);
    }

    // round absolute point to align with grid intersection
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

    // convert a point in actual canvas height and width coordinate space
    // into transformed coordinate space.
    public TransformPoint(point: Point): Point {

        point = point.Clone();

        point.x *= this.ScaleTransform.ScaleX;
        point.y *= this.ScaleTransform.ScaleY;

        point.x += this.TranslateTransform.X;
        point.y += this.TranslateTransform.Y;

        return point;
    }

    GetTransformedPoint (x: number, y: number): Point {
        return this.TransformPoint(new Point(x, y));
    }

    GetRelativePoint(point: Point, offset: Point): Point {
        return new Point(point.x + offset.x, point.y + offset.y);
    }

    public ConvertAbsoluteToNormalised(point: Point): Point {
        return new Point(Math.normalise(point.x, 0, this.Width), Math.normalise(point.y, 0, this.Height));
    }

    // convert a normalised point into an absolute
    public ConvertNormalisedToAbsolute(point: Point): Point {
        return new Point(point.x * this.Width, point.y * this.Height);
    }

    public ConvertGridUnitsToAbsolute(point: Point): Point {
        return new Point(this.Unit.width * point.x, this.Unit.height * point.y);
    }

    public ConvertAbsoluteToGridUnits(point: Point): Point {
        return new Point(point.x / this.Unit.width, point.y / this.Unit.width);
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
                var y = Math.floor(cellWidth * j);
                this.Ctx.beginPath();
                startPoint = this.GetTransformedPoint(0, y);
                this.Ctx.moveTo(startPoint.x, startPoint.y);
                endPoint = this.GetTransformedPoint(this.Width, y);
                this.Ctx.lineTo(endPoint.x, endPoint.y);
                this.Ctx.stroke();
                this.Ctx.closePath();
            }

            // cols
            for (var i = 0; i < this.Divisor + 1; i++) {
                var x = Math.floor(cellWidth * i);
                this.Ctx.beginPath();
                startPoint = this.GetTransformedPoint(x, 0);
                this.Ctx.moveTo(startPoint.x, startPoint.y);
                endPoint = this.GetTransformedPoint(x, this.Height);
                this.Ctx.lineTo(endPoint.x, endPoint.y);
                this.Ctx.stroke();
                this.Ctx.closePath();
            }
        }
    }






    // rounds absolute position to the nearest grid intersection in grid units.
    public GetGridPosition(point: Point): Point {

        //point = this.ConvertAbsoluteToNormalised(point);
        //var x = Math.round(point.x * this.Divisor);
        //var y = Math.round(point.y * this.GetHeightDivisor());
        //
        //return this.TransformPoint(new Point(x, y));

        return new Point();
    }

    // translate grid position into pixel position.
    public GetAbsPosition(point: Point): Point {

        //var x = (point.x / this.Divisor) * this.RenderSize.width;
        //var y = (point.y / this.GetHeightDivisor()) * this.RenderSize.height;

        return new Point();
        //return this.TransformPoint(new Point(x, y));
    }
}

export = Grid;