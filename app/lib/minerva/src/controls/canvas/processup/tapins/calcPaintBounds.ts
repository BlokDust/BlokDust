module minerva.controls.canvas.processup.tapins {
    export var calcPaintBounds = function (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        core.helpers.intersectBoundsWithClipPath(output.globalBoundsWithChildren, output.extentsWithChildren, input.effectPadding, input.renderXform, input.clip, input.layoutClip);
        var sbwc = output.surfaceBoundsWithChildren;
        var surface = tree.surface;
        if (surface && tree.isTop) {
            sbwc.x = sbwc.y = 0;
            sbwc.width = surface.width;
            sbwc.height = surface.height;
        } else {
            core.helpers.intersectBoundsWithClipPath(sbwc, output.extentsWithChildren, input.effectPadding, input.absoluteXform, input.clip, input.layoutClip);
        }

        return true;
    };
}