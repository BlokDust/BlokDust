module minerva.core.measure.tapins {
    export var doOverride: IMeasureTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, availableSize: Size): boolean {
        var ds = output.desiredSize;
        ds.width = ds.height = 0;
        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            child.measure(state.availableSize);
            Size.copyTo(child.assets.desiredSize, ds);
        }
        return true;
    };
}