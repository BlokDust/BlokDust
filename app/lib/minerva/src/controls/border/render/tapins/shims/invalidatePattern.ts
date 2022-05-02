module minerva.controls.border.render.tapins.shim {
    export function invalidatePattern (input: IInput, state: IShimState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
        if (!state.shouldRender)
            return true;

        if (Thickness.isEmpty(input.borderThickness)) {
            state.pattern = null;
            return true;
        }

        if (!state.oldMetrics) {
            state.oldMetrics = {};
            setOldMetrics(input, state, state.oldMetrics);
            state.pattern = null;
            return true;
        }

        if (didMetricsChange(input, state, state.oldMetrics))
            state.pattern = null;

        setOldMetrics(input, state, state.oldMetrics);
        return true;
    }

    function setOldMetrics (input: IInput, state: IState, metrics: any) {
        metrics.borderBrush = input.borderBrush;
        metrics.borderThickness = input.borderThickness;
        metrics.extents = input.extents;
        metrics.fillExtents = state.fillExtents;
        metrics.outerCornerRadius = state.outerCornerRadius;
        metrics.innerCornerRadius = state.innerCornerRadius;
    }

    function didMetricsChange (input: IInput, state: IState, metrics: any): boolean {
        return metrics.borderBrush !== input.borderBrush
            || !Rect.isEqual(metrics.extents, input.extents)
            || !Rect.isEqual(metrics.fillExtents, state.fillExtents)
            || !CornerRadius.isEqual(metrics.outerCornerRadius, state.outerCornerRadius)
            || !CornerRadius.isEqual(metrics.innerCornerRadius, state.innerCornerRadius);
    }
}