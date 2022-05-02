module minerva.controls.popup.processdown.tapins {
    export var preProcessXform = function (input: IInput, state: core.processdown.IState, output: core.processdown.IOutput, vpinput: core.processdown.IInput, tree: PopupUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Transform) === 0)
            return true;

        var child = tree.popupChild;
        if (child) {
            child.assets.dirtyFlags |= DirtyFlags.LocalTransform;
            core.Updater.$$addDownDirty(child);
        }
        return true;
    };
}