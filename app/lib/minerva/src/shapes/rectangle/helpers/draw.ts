module minerva.shapes.rectangle.helpers {
    export function draw (ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, radiusX: number, radiusY: number) {
        var right = left + width;
        var bottom = top + height;
        if (!radiusX && !radiusY) {
            ctx.beginPath();
            ctx.rect(left, top, right - left, bottom - top);
        }

        ctx.beginPath();
        ctx.moveTo(left + radiusX, top);
        //top edge
        ctx.lineTo(right - radiusX, top);
        //top right arc
        ctx.ellipse(right - radiusX, top + radiusY, radiusX, radiusY, 0, 3 * Math.PI / 2, 2 * Math.PI);
        //right edge
        ctx.lineTo(right, bottom - radiusY);
        //bottom right arc
        ctx.ellipse(right - radiusX, bottom - radiusY, radiusX, radiusY, 0, 0, Math.PI / 2);
        //bottom edge
        ctx.lineTo(left + radiusX, bottom);
        //bottom left arc
        ctx.ellipse(left + radiusX, bottom - radiusY, radiusX, radiusY, 0, Math.PI / 2, Math.PI);
        //left edge
        ctx.lineTo(left, top + radiusY);
        //top left arc
        ctx.ellipse(left + radiusX, top + radiusY, radiusX, radiusY, 0, Math.PI, 3 * Math.PI / 2);
        ctx.closePath();
    }
}