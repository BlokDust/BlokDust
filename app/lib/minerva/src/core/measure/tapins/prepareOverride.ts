module minerva.core.measure.tapins {
    export var prepareOverride: IMeasureTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, availableSize: Size): boolean {
        Size.copyTo(availableSize, state.availableSize);
        Thickness.shrinkSize(input.margin, state.availableSize);
        helpers.coerceSize(state.availableSize, input);
        return true;
    };
}