module minerva.core.processdown.tapins {
    export var calcAbsoluteXform: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Transform) === 0)
            return true;

        var ax = output.absoluteXform;
        mat3.copyTo(output.renderXform, ax);
        if (vpinput)
            mat3.apply(ax, vpinput.absoluteXform);

        return true;
    };
}