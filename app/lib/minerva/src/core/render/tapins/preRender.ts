module minerva.core.render.tapins {
    export var preRender: IRenderTapin = function (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean {
        var effect = input.effect;
        if (!effect)
            return true;
        ctx.save();
        effect.PreRender(ctx);
        return true;
    };
}