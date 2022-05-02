module minerva.controls.border.render.tapins.shim {
    export function doRender (input: IInput, state: IShimState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
        if (!state.shouldRender)
            return true;
        ctx.save();
        core.helpers.renderLayoutClip(ctx, input, tree);

        if (input.background)
            renderBackground(ctx, input, state);

        if (state.pattern) {
            renderPattern(ctx, input, state);
        } else if (input.borderBrush) {
            renderBorder(ctx, input, state);
        }

        ctx.restore();
        return true;
    }

    function renderPattern (ctx: core.render.RenderContext, input: IInput, state: IShimState) {
        var raw = ctx.raw;
        raw.beginPath();
        raw.fillStyle = state.pattern;
        helpers.drawBorderRect(raw, input.extents, state.outerCornerRadius);
        raw.fill();
    }

    function renderBackground (ctx: core.render.RenderContext, input: IInput, state: IShimState) {
        ctx.raw.beginPath();
        helpers.drawBorderRect(ctx.raw, state.fillExtents, state.innerCornerRadius);
        ctx.fillEx(input.background, state.fillExtents);
    }

    function renderBorder (ctx: core.render.RenderContext, input: IInput, state: IShimState) {
        var raw = ctx.raw;
        raw.beginPath();
        helpers.drawBorderRect(raw, state.strokeExtents, state.middleCornerRadius);
        raw.lineWidth = input.borderThickness.left;
        raw.lineCap = "butt";
        raw.lineJoin = "miter";
        raw.miterLimit = 0;
        input.borderBrush.setupBrush(raw, state.strokeExtents);
        raw.strokeStyle = input.borderBrush.toHtml5Object();
        raw.stroke();
    }
}