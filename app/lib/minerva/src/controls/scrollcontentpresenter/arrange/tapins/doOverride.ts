module minerva.controls.scrollcontentpresenter.arrange.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.UpdaterTree, finalRect: Rect): boolean {
        var as = state.arrangedSize;
        if (!tree.subtree) {
            as.width = as.height = 0;
            return true;
        }

        var sd = input.scrollData;
        if (helpers.clampOffsets(sd)) {
            sd.invalidate();
        }

        var desired = tree.subtree.assets.desiredSize;

        var cr = state.childRect;
        cr.x = -sd.offsetX;
        cr.y = -sd.offsetY;
        cr.width = Math.max(state.finalSize.width, desired.width);
        cr.height = Math.max(state.finalSize.height, desired.height);

        tree.subtree.arrange(cr);

        return true;
    }
}