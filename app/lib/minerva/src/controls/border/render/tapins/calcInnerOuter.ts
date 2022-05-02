module minerva.controls.border.render.tapins {
    export function calcInnerOuter (input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
        if (!state.shouldRender)
            return true;

        Rect.copyTo(input.extents, state.fillExtents);

        var bt = input.borderThickness;
        Thickness.shrinkRect(bt, state.fillExtents);

        var ia = state.innerCornerRadius;
        CornerRadius.copyTo(input.cornerRadius, ia);
        Thickness.shrinkCornerRadius(bt, ia);

        var oa = state.outerCornerRadius;
        CornerRadius.copyTo(input.cornerRadius, oa);
        Thickness.growCornerRadius(bt, oa);

        return true;
    }
}