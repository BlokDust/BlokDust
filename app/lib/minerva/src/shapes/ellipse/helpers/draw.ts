module minerva.shapes.ellipse.helpers {
    export function draw (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
        var radiusX = width / 2;
        var radiusY = height / 2;
        var right = x + width;
        var bottom = y + height;
        var centerX = x + radiusX;
        var centerY = y + radiusY;

        ctx.beginPath();
        if (width === height) { //circle
            ctx.arc(centerX, centerY, radiusX, 0, Math.PI * 2, false);
            return;
        }

        var kappa = .5522848; // 4 * ((sqrt(2) - 1) / 3)
        var ox = radiusX * kappa;
        var oy = radiusY * kappa;

        //move to left edge, halfway down
        ctx.moveTo(x, centerY);
        //top left bezier curve
        ctx.bezierCurveTo(x, centerY - oy, centerX - ox, y, centerX, y);
        //top right bezier curve
        ctx.bezierCurveTo(centerX + ox, y, right, centerY - oy, right, centerY);
        //bottom right bezier curve
        ctx.bezierCurveTo(right, centerY + oy, centerX + ox, bottom, centerX, bottom);
        //bottom left bezier curve
        ctx.bezierCurveTo(centerX - ox, bottom, x, centerY + oy, x, centerY);
        ctx.closePath();
    }
}