module minerva.core.processdown.tapins {
    export var processXform: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Transform) === 0)
            return true;

        if (!mat3.equal(input.renderXform, output.renderXform)) {
            //NOTE: Removing visual parent (or surface) `Invalidate`
            //      In our down pass, we should only be invalidating self and children
            output.dirtyFlags |= DirtyFlags.NewBounds;
            state.subtreeDownDirty |= DirtyFlags.Transform;
        } else if (!mat3.equal(input.absoluteXform, output.absoluteXform)) {
            state.subtreeDownDirty |= DirtyFlags.Transform;
        }

        //TODO: We can optimize to shift bounds rather than going through an UpdateBounds invalidation
        output.dirtyFlags |= DirtyFlags.Bounds;

        return true;
    };
}