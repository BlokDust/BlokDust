module minerva.core.render.tapins {
    export var postRender: IRenderTapin = function (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean {
        var effect = input.effect;
        if (!effect)
            return true;
        effect.PostRender(ctx);
        ctx.restore();
        return true;
    };
}