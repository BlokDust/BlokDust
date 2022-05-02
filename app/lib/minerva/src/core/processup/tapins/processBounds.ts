module minerva.core.processup.tapins {
    export var processBounds: IProcessUpTapin = function (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;
        state.hasNewBounds = false;
        if (!Rect.isEqual(input.globalBoundsWithChildren, output.globalBoundsWithChildren)) {
            var vo = tree.visualOwner;
            vo.updateBounds();
            vo.invalidate(input.surfaceBoundsWithChildren);
            state.hasNewBounds = true;
        } else if (!Rect.isEqual(input.extentsWithChildren, output.extentsWithChildren) || input.forceInvalidate) {
            state.hasNewBounds = true;
        }
        output.forceInvalidate = false;
        return true;
    };
}