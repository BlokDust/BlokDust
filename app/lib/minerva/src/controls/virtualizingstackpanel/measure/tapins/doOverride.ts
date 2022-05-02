module minerva.controls.virtualizingstackpanel.measure.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean {
        var ca = state.childAvailable;
        Size.copyTo(state.availableSize, ca);
        var desired = output.desiredSize;
        desired.width = desired.height = 0;
        return true;
    }
}