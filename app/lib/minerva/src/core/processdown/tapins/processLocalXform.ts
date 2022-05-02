module minerva.core.processdown.tapins {
    export var processLocalXform: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.LocalTransform) === 0)
            return true;

        var local = mat3.identity(state.localXform);
        var render = input.renderTransform;
        if (!render)
            return true;

        var origin = state.xformOrigin;
        mat3.translate(local, -origin.x, -origin.y);
        mat3.apply(local, render.getRaw());
        mat3.translate(local, origin.x, origin.y);

        return true;
    };
}