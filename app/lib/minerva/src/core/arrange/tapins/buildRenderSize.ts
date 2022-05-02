module minerva.core.arrange.tapins {
    export var buildRenderSize: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        Size.copyTo(state.arrangedSize, output.renderSize);
        if (!Size.isEqual(input.renderSize, output.renderSize)) {
            if (!output.lastRenderSize) {
                output.lastRenderSize = output.renderSize;
                output.uiFlags |= UIFlags.SizeHint;
            }
        }
        return true;
    };
}