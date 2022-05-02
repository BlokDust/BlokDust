module minerva.core.arrange.tapins {
    export var calcStretched: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        Rect.copyTo(finalRect, output.layoutSlot);

        var fr = state.finalRect;
        Thickness.shrinkRect(input.margin, fr);

        var stretched = state.stretched;
        stretched.width = fr.width;
        stretched.height = fr.height;
        helpers.coerceSize(stretched, input);

        return true;
    }
}