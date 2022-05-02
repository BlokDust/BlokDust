module minerva.core.arrange.tapins {
    export var validateVisibility: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        if (input.visibility !== Visibility.Visible) {
            Rect.copyTo(state.finalRect, output.layoutSlot);
            return false;
        }
        return true;
    };
}