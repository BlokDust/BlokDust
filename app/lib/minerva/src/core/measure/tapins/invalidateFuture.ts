module minerva.core.measure.tapins {
    export var invalidateFuture: IMeasureTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, availableSize: Size): boolean {
        output.dirtyFlags |= DirtyFlags.Arrange;
        output.uiFlags |= UIFlags.ArrangeHint;
        output.dirtyFlags |= DirtyFlags.Bounds;
        return true;
    };
}