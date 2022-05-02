module minerva.core.measure.tapins {
    export var validateVisibility: IMeasureTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, availableSize: Size): boolean {
        if (input.visibility !== Visibility.Visible) {
            Size.copyTo(availableSize, output.previousConstraint);
            var ds = output.desiredSize;
            ds.width = ds.height = 0;
            return false;
        }
        return true;
    };
}