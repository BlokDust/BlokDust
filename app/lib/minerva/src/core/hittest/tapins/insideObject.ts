module minerva.core.hittest.tapins {
    export function insideObject (data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean {
        if (data.hitChildren)
            return true;

        var bounds = data.bounds;
        Rect.copyTo(data.assets.extents, bounds);
        Rect.transform(bounds, ctx.currentTransform);
        if (!Rect.containsPoint(bounds, pos)) {
            hitList.shift();
            ctx.restore();
            return false;
        }

        return true;
    }
}