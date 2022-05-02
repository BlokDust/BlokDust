module minerva.shapes.shape.render.tapins {
    export function calcShouldDraw (input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean {
        state.shouldDraw = false;
        if (input.shapeFlags === ShapeFlags.Empty)
            return true;
        if (!input.fill && !input.stroke)
            return true;
        state.shouldDraw = true;
        return true;
    }
}