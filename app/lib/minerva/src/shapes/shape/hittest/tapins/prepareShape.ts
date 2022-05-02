module minerva.shapes.shape.hittest.tapins {
    export function prepareShape (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
        ctx.save();
        return true;
    }
}