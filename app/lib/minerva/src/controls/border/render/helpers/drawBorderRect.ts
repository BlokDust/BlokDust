module minerva.controls.border.render.helpers {
    var ARC_TO_BEZIER = 0.55228475;

    export function drawBorderRect (ctx: CanvasRenderingContext2D, extents: Rect, cr?: ICornerRadius) {
        if (!cr || CornerRadius.isEmpty(cr)) {
            ctx.rect(extents.x, extents.y, extents.width, extents.height);
            return;
        }

        var top_adj = Math.max(cr.topLeft + cr.topRight - extents.width, 0) / 2;
        var bottom_adj = Math.max(cr.bottomLeft + cr.bottomRight - extents.width, 0) / 2;
        var left_adj = Math.max(cr.topLeft + cr.bottomLeft - extents.height, 0) / 2;
        var right_adj = Math.max(cr.topRight + cr.bottomRight - extents.height, 0) / 2;

        var tlt = cr.topLeft - top_adj;
        ctx.moveTo(extents.x + tlt, extents.y);

        var trt = cr.topRight - top_adj;
        var trr = cr.topRight - right_adj;
        ctx.lineTo(extents.x + extents.width - trt, extents.y);
        ctx.bezierCurveTo(
            extents.x + extents.width - trt + trt * ARC_TO_BEZIER, extents.y,
            extents.x + extents.width, extents.y + trr - trr * ARC_TO_BEZIER,
            extents.x + extents.width, extents.y + trr);

        var brr = cr.bottomRight - right_adj;
        var brb = cr.bottomRight - bottom_adj;
        ctx.lineTo(extents.x + extents.width, extents.y + extents.height - brr);
        ctx.bezierCurveTo(
            extents.x + extents.width, extents.y + extents.height - brr + brr * ARC_TO_BEZIER,
            extents.x + extents.width + brb * ARC_TO_BEZIER - brb, extents.y + extents.height,
            extents.x + extents.width - brb, extents.y + extents.height);

        var blb = cr.bottomLeft - bottom_adj;
        var bll = cr.bottomLeft - left_adj;
        ctx.lineTo(extents.x + blb, extents.y + extents.height);
        ctx.bezierCurveTo(
            extents.x + blb - blb * ARC_TO_BEZIER, extents.y + extents.height,
            extents.x, extents.y + extents.height - bll + bll * ARC_TO_BEZIER,
            extents.x, extents.y + extents.height - bll);

        var tll = cr.topLeft - left_adj;
        ctx.lineTo(extents.x, extents.y + tll);
        ctx.bezierCurveTo(
            extents.x, extents.y + tll - tll * ARC_TO_BEZIER,
            extents.x + tlt - tlt * ARC_TO_BEZIER, extents.y,
            extents.x + tlt, extents.y);
    }
}