module minerva.core.render.tapins {
    export var prepareContext: IRenderTapin = function (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean {
        ctx.save();
        ctx.preapply(input.renderXform);
        ctx.raw.globalAlpha = input.totalOpacity;
        return true;
    };
}