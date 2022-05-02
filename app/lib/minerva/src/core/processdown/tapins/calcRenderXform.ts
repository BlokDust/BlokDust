module minerva.core.processdown.tapins {
    export var calcRenderXform: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Transform) === 0)
            return true;

        var rx = output.renderXform;
        mat3.copyTo(state.localXform, rx);
        mat3.apply(rx, input.layoutXform);
        if (input.carrierXform)
            mat3.apply(rx, input.carrierXform);

        return true;
    };
}