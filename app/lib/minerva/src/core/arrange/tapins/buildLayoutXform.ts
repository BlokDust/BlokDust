module minerva.core.arrange.tapins {
    export var buildLayoutXform: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        var vo = output.visualOffset;
        var layoutXform = mat3.createTranslate(vo.x, vo.y, output.layoutXform);
        if (state.flipHorizontal) {
            mat3.translate(layoutXform, state.arrangedSize.width, 0);
            mat3.scale(layoutXform, -1, 1);
        }
        if (!mat3.equal(input.layoutXform, output.layoutXform))
            output.dirtyFlags |= DirtyFlags.LocalTransform;
        return true;
    };
}