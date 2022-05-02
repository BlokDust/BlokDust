module minerva.core.render.tapins {
    export var applyClip: IRenderTapin = function (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean {
        var clip = input.clip;
        if (clip)
            ctx.clipGeometry(clip);
        return true;
    };
}