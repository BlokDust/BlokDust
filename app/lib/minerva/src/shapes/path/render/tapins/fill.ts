module minerva.shapes.path.render.tapins {
    export function fill (input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean {
        if (!state.shouldDraw)
            return true;
        if (input.fill)
            ctx.fillEx(input.fill, input.shapeRect, input.data ? input.data.fillRule : FillRule.EvenOdd);
        return true;
    }
}