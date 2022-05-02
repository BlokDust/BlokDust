module minerva.controls.popup.processdown.tapins {
    export var postProcessXform = function (input: IInput, state: core.processdown.IState, output: core.processdown.IOutput, vpinput: core.processdown.IInput, tree: PopupUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Transform) === 0)
            return true;

        var child = tree.popupChild;
        if (!child)
            return true;

        child.assets.dirtyFlags |= DirtyFlags.LocalTransform;

        var carrier = child.assets.carrierXform;
        if (!carrier)
            carrier = child.assets.carrierXform || mat3.create();
        mat3.copyTo(output.absoluteXform, carrier);
        mat3.translate(carrier, input.horizontalOffset, input.verticalOffset);

        core.Updater.$$addDownDirty(child);

        return true;
    };
}