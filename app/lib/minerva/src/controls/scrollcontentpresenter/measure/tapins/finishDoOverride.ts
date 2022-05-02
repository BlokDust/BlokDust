module minerva.controls.scrollcontentpresenter.measure.tapins {
    export function finishDoOverride (input: IInput, state: IState, output: core.measure.IOutput, tree: core.UpdaterTree, availableSize: Size): boolean {
        var ds = output.desiredSize;
        var sd = input.scrollData;

        Size.copyTo(state.availableSize, ds);
        ds.width = Math.min(ds.width, sd.extentWidth);
        ds.height = Math.min(ds.height, sd.extentHeight);

        return true;
    }
}