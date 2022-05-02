module minerva.core.hittest.tapins {
    export function insideClip (data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean {
        var clip = data.assets.clip;
        if (!clip)
            return true;

        var bounds = clip.GetBounds();
        Rect.transform(bounds, ctx.currentTransform);
        if (!Rect.containsPoint(bounds, pos)) {
            ctx.restore();
            return false;
        }

        clip.Draw(ctx);
        if (!ctx.raw.isPointInPath(pos.x, pos.y)) {
            ctx.restore();
            return false;
        }

        return true;
    }
}