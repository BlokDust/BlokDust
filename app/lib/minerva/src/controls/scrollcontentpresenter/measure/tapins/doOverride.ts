module minerva.controls.scrollcontentpresenter.measure.tapins {
    export var doOverride = function (input: IInput, state: IState, output: core.measure.IOutput, tree: core.UpdaterTree, availableSize: Size): boolean {
        var ds = output.desiredSize;
        ds.width = ds.height = 0;

        if (!tree.subtree)
            return true;

        var sd = input.scrollData;
        var ideal = state.idealSize;
        ideal.width = !sd.canHorizontallyScroll ? state.availableSize.width : Number.POSITIVE_INFINITY;
        ideal.height = !sd.canVerticallyScroll ? state.availableSize.height : Number.POSITIVE_INFINITY;

        tree.subtree.measure(ideal);

        return true;
    };
}