module minerva.core.processdown.tapins {
    export var propagateDirtyToChildren: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        var newDownDirty = state.subtreeDownDirty & DirtyFlags.PropagateDown;
        if (newDownDirty === 0)
            return true;
        for (var walker = tree.walk(); walker.step();) {
            walker.current.assets.dirtyFlags |= newDownDirty;
            Updater.$$addDownDirty(walker.current);
        }
        return true;
    };
}