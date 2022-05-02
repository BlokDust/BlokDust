module minerva.controls.image.render.tapins {
    export function doRender (input: IInput, state: IState, output: core.render.IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
        var source = input.source;
        if (!source || source.pixelWidth === 0 || source.pixelHeight === 0)
            return true;

        ctx.save();
        core.helpers.renderLayoutClip(ctx, input, tree);
        ctx.preapply(input.imgXform);
        source.draw(ctx.raw);
        ctx.restore();

        return true;
    }
}