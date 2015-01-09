
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

    // rounds absolute position to the nearest grid intersection in grid units.
    public GetGridPosition(position: Point): Point {
        position = this.NormalisePoint(position);
        var x = Math.round(position.x * this.Divisor);
        var y = Math.round(position.y * this.GetHeightDivisor());
        return this.Transform(new Point(x, y));
    }

    // translate grid position into pixel position.
    public GetAbsPosition(position: Point): Point {
        var x = (position.x / this.Divisor) * this.Width;
        var y = (position.y / this.GetHeightDivisor()) * this.Height;
        return this.Transform(new Point(x, y));
    }

    public NormalisePoint(point: Point): Point {
        return new Point(Math.normalise(point.x, 0, this.Width), Math.normalise(point.y, 0, this.Height));
    }

    // utility for converting an absolute point (actual canvas height and width)
    // into zoomed/scrolled coordinate space.
    public Transform(point: Point): Point {
        var scale: ScaleTransform = <ScaleTransform>this.TransformGroup.Children.GetValueAt(0);
        var translate: TranslateTransform = <TranslateTransform>this.TransformGroup.Children.GetValueAt(1);

        point.x *= scale.ScaleX;
        point.y *= scale.ScaleY;

        point.x += translate.X;
        point.y += translate.Y;

        return point;
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
/*        if (window.debug) {
            var cellWidth = this.Width / this.Divisor;

            this.Ctx.lineWidth = 1;
            this.Ctx.strokeStyle = '#3d3256';

            for (var i = 0; i < this.Divisor; i++) {
                var x = Math.floor(cellWidth * i);
                this.Ctx.beginPath();
                this.Ctx.moveTo(x, 0);
                this.Ctx.lineTo(x, this.Height);
                this.Ctx.stroke();
                this.Ctx.closePath();
            }

            for (var j = 0; j < this.Divisor; j++) {
                var y = Math.floor(cellWidth * j);
                this.Ctx.beginPath();
                this.Ctx.moveTo(0, y);
                this.Ctx.lineTo(this.Width, y);
                this.Ctx.stroke();
                this.Ctx.closePath();
            }
        }*/
    }
}

export = Grid;