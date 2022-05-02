module minerva.shapes.shape.render.tapins {
    export function prepareDraw (input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
        if (!state.shouldDraw)
            return true;
        ctx.save();
        core.helpers.renderLayoutClip(ctx, input, tree);
        return true;
    }
}