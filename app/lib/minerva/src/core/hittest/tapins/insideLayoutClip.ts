module minerva.core.hittest.tapins {
    export function insideLayoutClip (data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean {
        if (data.hitChildren)
            return true;

        var clc = data.assets.compositeLayoutClip;
        if (!clc || Rect.isEmpty(clc))
            return true;

        var lcbounds = data.layoutClipBounds;
        Rect.copyTo(clc, lcbounds);
        Rect.transform(lcbounds, ctx.currentTransform);

        if (!Rect.containsPoint(lcbounds, pos)) {
            hitList.shift();
            ctx.restore();
            return false;
        }

        return true;
    }
}