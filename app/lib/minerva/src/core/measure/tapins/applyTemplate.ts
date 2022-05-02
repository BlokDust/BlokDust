module minerva.core.measure.tapins {
    export var applyTemplate: IMeasureTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, availableSize: Size): boolean {
        tree.applyTemplate();
        return true;
    };
}