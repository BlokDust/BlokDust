module minerva {
    var hitTestCtx: minerva.core.render.RenderContext = null;

    export function findElementsInHostSpace (pos: Point, host: core.Updater) {
        hitTestCtx = hitTestCtx || new core.render.RenderContext(<CanvasRenderingContext2D>document.createElement('canvas').getContext('2d'));
        var inv = mat3.inverse(host.assets.renderXform, mat3.create());

        hitTestCtx.save();
        hitTestCtx.preapply(inv);
        var list: minerva.core.Updater[] = [];
        host.hitTest(pos, list, hitTestCtx, true);
        hitTestCtx.restore();
        return list;
    }
}
