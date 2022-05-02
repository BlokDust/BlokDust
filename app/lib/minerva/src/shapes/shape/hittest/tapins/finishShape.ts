module minerva.shapes.shape.hittest.tapins {
    export function finishShape (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
        var assets = data.assets;
        var inside = (!!assets.fill && ctx.raw.isPointInPath(pos.x, pos.y))
            || (!!assets.stroke && ctx.isPointInStrokeEx(assets, pos.x, pos.y));
        ctx.restore();

        if (!inside) {
            hitList.shift();
            ctx.restore();
            return false;
        }

        return true;
    }
}