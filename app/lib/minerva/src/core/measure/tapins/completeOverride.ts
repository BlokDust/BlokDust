module minerva.core.measure.tapins {
    export var completeOverride: IMeasureTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, availableSize: Size): boolean {
        output.dirtyFlags &= ~DirtyFlags.Measure;
        Size.copyTo(output.desiredSize, output.hiddenDesire);
        return true;
    };
}