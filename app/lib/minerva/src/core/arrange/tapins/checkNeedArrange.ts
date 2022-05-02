module minerva.core.arrange.tapins {
    export var checkNeedArrange: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        if ((input.dirtyFlags & DirtyFlags.Arrange) > 0)
            return true;
        return !Rect.isEqual(output.layoutSlot, state.finalRect);
    };
}