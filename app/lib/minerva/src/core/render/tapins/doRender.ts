module minerva.core.render.tapins {
    export var doRender: IRenderTapin = function (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean {
        return true;
    };
}