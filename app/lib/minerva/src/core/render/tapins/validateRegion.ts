module minerva.core.render.tapins {
    export var validateRegion: IRenderTapin = function (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean {
        var r = state.renderRegion;
        Rect.copyTo(input.surfaceBoundsWithChildren, r);
        Rect.roundOut(r);
        Rect.intersection(r, region);
        return r.width > 0 && r.height > 0;
    };
}