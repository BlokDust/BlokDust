module minerva.core.sizing.tapins {
    export var calcUseRender: ISizingTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree): boolean {
        state.useRender = true;
        return true;
    };
}