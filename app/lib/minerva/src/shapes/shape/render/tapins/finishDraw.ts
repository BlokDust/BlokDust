module minerva.shapes.shape.render.tapins {
    export function finishDraw (input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean {
        if (!state.shouldDraw)
            return true;
        ctx.restore();
        return true;
    }
}