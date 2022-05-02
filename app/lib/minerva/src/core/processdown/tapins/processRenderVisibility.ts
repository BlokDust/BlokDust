module minerva.core.processdown.tapins {
    export var processRenderVisibility: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.RenderVisibility) === 0)
            return true;

        //Update bounds
        output.dirtyFlags |= DirtyFlags.Bounds;
        //NOTE: Removing visual parent `UpdateBounds`
        //      In our down pass, we should only be affecting self and children

        //Calculate
        if (vpinput) {
            output.totalOpacity = vpinput.totalOpacity * input.opacity;
            output.totalIsRenderVisible = vpinput.totalIsRenderVisible && (input.visibility === Visibility.Visible);
        } else {
            output.totalOpacity = input.opacity;
            output.totalIsRenderVisible = input.visibility === Visibility.Visible;
        }

        //Update bounds, propagate render visibility
        if (input.totalIsRenderVisible !== output.totalIsRenderVisible) {
            output.dirtyFlags |= DirtyFlags.NewBounds;
            state.subtreeDownDirty |= DirtyFlags.RenderVisibility;
        }
        if (input.totalOpacity !== output.totalOpacity) {
            state.subtreeDownDirty |= DirtyFlags.RenderVisibility;
        }

        return true;
    };
}