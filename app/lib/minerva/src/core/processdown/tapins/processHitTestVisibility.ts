module minerva.core.processdown.tapins {
    export var processHitTestVisibility: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.HitTestVisibility) === 0)
            return true;

        if (vpinput) {
            output.totalIsHitTestVisible = vpinput.totalIsHitTestVisible && input.isHitTestVisible;
        } else {
            output.totalIsHitTestVisible = input.isHitTestVisible;
        }

        if (output.totalIsHitTestVisible !== input.totalIsHitTestVisible)
            state.subtreeDownDirty |= DirtyFlags.HitTestVisibility;

        return true;
    };
}