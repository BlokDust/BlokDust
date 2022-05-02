module minerva.core.processup.tapins {
    export var calcPaintBounds: IProcessUpTapin = function (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        helpers.intersectBoundsWithClipPath(output.globalBoundsWithChildren, output.extentsWithChildren, input.effectPadding, input.renderXform, input.clip, input.layoutClip);
        helpers.intersectBoundsWithClipPath(output.surfaceBoundsWithChildren, output.extentsWithChildren, input.effectPadding, input.absoluteXform, input.clip, input.layoutClip);

        return true;
    };
}