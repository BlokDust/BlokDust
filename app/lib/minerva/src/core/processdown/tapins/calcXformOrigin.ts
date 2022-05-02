module minerva.core.processdown.tapins {
    export var calcXformOrigin: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        var xo = state.xformOrigin;
        var userxo = input.renderTransformOrigin;
        if (!userxo) {
            xo.x = 0;
            xo.y = 0;
        } else {
            xo.x = input.actualWidth * userxo.x;
            xo.y = input.actualHeight * userxo.y;
        }
        return true;
    };
}