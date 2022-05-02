module minerva.core.measure.tapins {
    export var finishDesired: IMeasureTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, availableSize: Size): boolean {
        var ds = output.desiredSize;
        helpers.coerceSize(ds, input);
        Thickness.growSize(input.margin, ds);
        ds.width = Math.min(ds.width, availableSize.width);
        ds.height = Math.min(ds.height, availableSize.height);
        if (input.useLayoutRounding) {
            ds.width = Math.round(ds.width);
            ds.height = Math.round(ds.height);
        }
        return true;
    };
}