module minerva.controls.stackpanel.measure.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean {
        var ca = state.childAvailable;
        ca.width = ca.height = Number.POSITIVE_INFINITY;
        var desired = output.desiredSize;
        desired.width = desired.height = 0;
        return true;
    }
}