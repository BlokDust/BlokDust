module minerva.controls.image.measure.tapins {
    export function doOverride (input: IInput, state: IState, output: core.measure.IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean {
        var ds = output.desiredSize;
        ds.width = state.imageBounds.width * state.stretchX;
        ds.height = state.imageBounds.height * state.stretchY;
        return true;
    }
}