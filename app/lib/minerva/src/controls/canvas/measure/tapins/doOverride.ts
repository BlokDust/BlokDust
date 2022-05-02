module minerva.controls.canvas.measure.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean {
        var available = state.availableSize;
        available.width = available.height = Number.POSITIVE_INFINITY;
        for (var walker = tree.walk(); walker.step();) {
            walker.current.measure(available);
        }
        var desired = output.desiredSize;
        desired.width = desired.height = 0;
        return true;
    }
}