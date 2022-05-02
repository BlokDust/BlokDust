module minerva.path.segments {
    export function roundedRect (x: number, y: number, width: number, height: number, radiusX: number, radiusY: number): IRect {
        if (radiusX === 0.0 && radiusY === 0.0)
            return rect(x, y, width, height);

        return <IRect>{
            sx: null,
            sy: null,
            ex: x,
            ey: y,
            isSingle: true,
            x: x,
            y: y,
            width: width,
            height: height,
            radiusX: radiusX,
            radiusY: radiusY,
            draw: function (ctx: CanvasRenderingContext2D) {
                minerva.shapes.rectangle.helpers.draw(ctx, x, y, width, height, radiusX, radiusY);
            },
            extendFillBox: function (box: IBoundingBox) {
                box.l = Math.min(box.l, x);
                box.r = Math.max(box.r, x + width);
                box.t = Math.min(box.t, y);
                box.b = Math.max(box.b, y + height);
            },
            extendStrokeBox: function (box: IBoundingBox, pars: IStrokeParameters) {
                var hs = pars.strokeThickness / 2.0;
                box.l = Math.min(box.l, x - hs);
                box.r = Math.max(box.r, x + width + hs);
                box.t = Math.min(box.t, y - hs);
                box.b = Math.max(box.b, y + height + hs);
            },
            getStartVector: function (): number[] {
                return null;
            },
            getEndVector: function (): number[] {
                return null;
            }
        };
    }
}