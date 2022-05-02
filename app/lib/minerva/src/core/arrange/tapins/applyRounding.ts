module minerva.core.arrange.tapins {
    export var applyRounding: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        var fr = state.finalRect;
        if (input.useLayoutRounding) {
            fr.x = Math.round(finalRect.x);
            fr.y = Math.round(finalRect.y);
            fr.width = Math.round(finalRect.width);
            fr.height = Math.round(finalRect.height);
        } else {
            Rect.copyTo(finalRect, fr);
        }
        return true;
    };
}