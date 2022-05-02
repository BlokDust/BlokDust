module minerva.controls.scrollcontentpresenter.measure.tapins {
    export function updateExtents (input: IInput, state: IState, output: core.measure.IOutput, tree: core.UpdaterTree, availableSize: Size): boolean {
        var sd = input.scrollData;
        var viewport = state.availableSize;
        var extent = tree.subtree.assets.desiredSize;

        var changed = sd.viewportWidth !== viewport.width
            || sd.viewportHeight !== viewport.height
            || sd.extentWidth !== extent.width
            || sd.extentHeight !== extent.height;
        sd.viewportWidth = viewport.width;
        sd.viewportHeight = viewport.height;
        sd.extentWidth = extent.width;
        sd.extentHeight = extent.height;

        if (helpers.clampOffsets(sd) || changed) {
            sd.invalidate();
        }

        return true;
    }
}