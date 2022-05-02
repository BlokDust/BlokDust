module minerva.core {
    export interface IShape {
        stretch: Stretch;
        fill: IBrush;
        fillRule: FillRule;
        stroke: IBrush;
        strokeThickness: number;
        strokeStartLineCap: PenLineCap;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;

        actualWidth: number;
        actualHeight: number;

        draw(ctx: render.RenderContext): IShape;
        doFill(ctx: render.RenderContext, region: Rect): IShape;
        doStroke(ctx: render.RenderContext, region: Rect): IShape;
    }
}