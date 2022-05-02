module minerva.controls.usercontrol.measure.tapins {
    export function doOverride (input: core.measure.IInput, state: core.measure.IState, output: core.measure.IOutput, tree: control.ControlUpdaterTree, availableSize: Size): boolean {
        var ds = output.desiredSize;
        var subtree = tree.subtree;
        if (subtree) {
            subtree.measure(state.availableSize);
            Size.copyTo(subtree.assets.desiredSize, ds);
        }
        return true;
    }
}