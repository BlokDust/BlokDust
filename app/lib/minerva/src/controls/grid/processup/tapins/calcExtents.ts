module minerva.controls.grid.processup.tapins {
    export function calcExtents (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        var e = output.extents;
        var ewc = output.extentsWithChildren;
        e.x = ewc.x = 0;
        e.y = ewc.y = 0;
        var as = state.actualSize;
        e.width = ewc.width = as.width;
        e.height = ewc.height = as.height;

        if (input.showGridLines)
            return true;

        var assets: core.IUpdaterAssets;
        for (var walker = tree.walk(); walker.step();) {
            assets = walker.current.assets;
            if (assets.totalIsRenderVisible)
                Rect.union(ewc, assets.globalBoundsWithChildren);
        }

        return true;
    }
}