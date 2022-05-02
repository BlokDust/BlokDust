module minerva.controls.border.render.tapins {
    export function calcShouldRender (input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
        state.shouldRender = false;
        if (!input.background && !input.borderBrush)
            return true;
        if (Rect.isEmpty(input.extents))
            return true;
        var fillOnly = !input.borderBrush || !input.borderThickness || Thickness.isEmpty(input.borderThickness);
        if (fillOnly && !input.background)
            return true;
        state.shouldRender = true;
        return true;
    }
}