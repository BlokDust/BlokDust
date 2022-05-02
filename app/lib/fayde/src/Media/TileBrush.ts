/// <reference path="Brush.ts" />
/// <reference path="Enums.ts" />

module Fayde.Media {
    function computeImageMatrix(width: number, height: number, sw: number, sh: number, stretch: Stretch, alignX: AlignmentX, alignY: AlignmentY): number[] {
        var sx = width / sw;
        var sy = height / sh;
        if (width === 0)
            sx = 1.0;
        if (height === 0)
            sy = 1.0;

        if (stretch === Stretch.Fill) {
            return mat3.createScale(sx, sy);
        }

        var scale = 1.0;
        var dx = 0.0;
        var dy = 0.0;
        switch (stretch) {
            case Stretch.Uniform:
                scale = sx < sy ? sx : sy;
                break;
            case Stretch.UniformToFill:
                scale = sx < sy ? sy : sx;
                break;
            case Stretch.None:
                break;
        }

        switch (alignX) {
            case AlignmentX.Left:
                dx = 0.0;
                break;
            case AlignmentX.Center:
                dx = (width - (scale * sw)) / 2;
                break;
            case AlignmentX.Right:
            default:
                dx = width - (scale * sw);
                break;
        }

        switch (alignY) {
            case AlignmentY.Top:
                dy = 0.0;
                break;
            case AlignmentY.Center:
                dy = (height - (scale * sh)) / 2;
                break;
            case AlignmentY.Bottom:
            default:
                dy = height - (scale * sh);
                break;
        }
        var m = mat3.createScale(scale, scale);
        mat3.translate(m, dx, dy);
        return m;
    }

    export class TileBrush extends Brush {
        static AlignmentXProperty = DependencyProperty.RegisterCore("AlignmentX", () => new Enum(AlignmentX), TileBrush, AlignmentX.Center, (d: TileBrush, args) => d.InvalidateBrush());
        static AlignmentYProperty = DependencyProperty.RegisterCore("AlignmentY", () => new Enum(AlignmentY), TileBrush, AlignmentY.Center, (d: TileBrush, args) => d.InvalidateBrush());
        static StretchProperty = DependencyProperty.RegisterCore("Stretch", () => new Enum(Stretch), TileBrush, Stretch.Fill, (d: TileBrush, args) => d.InvalidateBrush());
        AlignmentX: AlignmentX;
        AlignmentY: AlignmentY;
        Stretch: Stretch;

        CreateBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect) {
            var imgExtents = this.GetTileExtents();

            var tmpCanvas = <HTMLCanvasElement>document.createElement("canvas");
            tmpCanvas.width = bounds.width;
            tmpCanvas.height = bounds.height;

            var tmpCtx = <CanvasRenderingContext2D>tmpCanvas.getContext("2d");

            var mat = computeImageMatrix(bounds.width, bounds.height,
                imgExtents.width, imgExtents.height, this.Stretch, this.AlignmentX, this.AlignmentY);
            tmpCtx.setTransform(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5]);

            this.DrawTile(tmpCtx, bounds);

            return ctx.createPattern(tmpCanvas, "no-repeat");
        }
        GetTileExtents(): minerva.Rect { return undefined; }
        DrawTile(canvasCtx: CanvasRenderingContext2D, bounds: minerva.Rect) { }
    }
    Fayde.CoreLibrary.add(TileBrush);
}