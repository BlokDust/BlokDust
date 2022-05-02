module minerva.core.render.tapins {
    export var restoreContext: IRenderTapin = function (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean {
        ctx.restore();
        return true;
    };
}