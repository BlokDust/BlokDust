module minerva.core.hittest.tapins {
    export function canHit (data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean {
        var assets = data.assets;
        return !!assets.totalIsRenderVisible
            && !!assets.totalIsHitTestVisible;
    }
}