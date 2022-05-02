module minerva.core.processup.tapins {
    export var calcActualSize: IProcessUpTapin = function (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        var actual = state.actualSize;
        actual.width = input.actualWidth;
        actual.height = input.actualHeight;
        helpers.coerceSize(actual, input);
        if (isNaN(actual.width))
            actual.width = 0;
        if (isNaN(actual.height))
            actual.height = 0;

        return true;
    };
}