module minerva.controls.image.hittest.tapins {
    export function insideStretch (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
        var source = data.assets.source;
        if (!source || source.pixelWidth === 0 || source.pixelHeight === 0) {
            hitList.shift();
            ctx.restore();
            return false;
        }

        var stretch = data.assets.stretch;
        if (stretch === Stretch.Fill || stretch === Stretch.UniformToFill)
            return true;

        var ir = data.imgRect;
        ir.x = ir.y = 0;
        ir.width = source.pixelWidth;
        ir.height = source.pixelHeight;
        Rect.transform(ir, data.assets.imgXform);
        Rect.transform(ir, ctx.currentTransform);

        if (!Rect.containsPoint(ir, pos)) {
            hitList.shift();
            ctx.restore();
            return false;
        }

        return true;
    }
}