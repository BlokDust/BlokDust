module minerva.core.processdown.tapins {
    //NOTE: Canvas+UserControl doesn't do this
    export var processLayoutClip: IProcessDownTapin = function (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.LayoutClip) === 0)
            return true;

        var lc = input.layoutClip;
        var clc = output.compositeLayoutClip;
        if (!vpinput || Rect.isEmpty(vpinput.compositeLayoutClip)) {
            Rect.copyTo(lc, clc);
        } else {
            Rect.copyTo(vpinput.compositeLayoutClip, clc);
            if (!Rect.isEmpty(lc))
                Rect.intersection(clc, lc);
        }

        if (!Rect.isEqual(input.compositeLayoutClip, output.compositeLayoutClip)) {
            state.subtreeDownDirty |= DirtyFlags.LayoutClip;
        }

        return true;
    };
}