module minerva.core.render.tapins {
    export var renderChildren: IRenderTapin = function (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean {
        for (var walker = tree.walk(WalkDirection.ZForward); walker.step();) {
            walker.current.render(ctx, state.renderRegion);
        }
        return true;
    };
}