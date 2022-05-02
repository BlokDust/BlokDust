module minerva.core.hittest.tapins {
    export function canHitInside (data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean {
        if (data.hitChildren)
            return true;

        hitList.shift();
        ctx.restore();
        return false;
    }
}