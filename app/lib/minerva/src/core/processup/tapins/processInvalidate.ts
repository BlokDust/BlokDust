module minerva.core.processup.tapins {
    export var processInvalidate: IProcessUpTapin = function (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Invalidate) === 0 && !state.hasInvalidate)
            return true;
        var dirty = output.dirtyRegion;
        tree.visualOwner.invalidate(dirty);
        dirty.x = dirty.y = dirty.width = dirty.height = 0;
        return true;
    };
}