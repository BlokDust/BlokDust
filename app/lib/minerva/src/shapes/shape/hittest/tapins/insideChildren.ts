module minerva.shapes.shape.hittest.tapins {
    export function insideChildren (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
        hitList.unshift(data.updater);
        data.hitChildren = false;
        return true;
    }
}