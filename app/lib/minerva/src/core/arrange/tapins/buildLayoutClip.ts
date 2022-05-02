module minerva.core.arrange.tapins {
    var testRect = new Rect();
    var fwClip = new Rect();
    export var buildLayoutClip: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        var lc = output.layoutClip;
        Rect.copyTo(state.finalRect, lc);

        var vo = output.visualOffset;
        lc.x = Math.max(lc.x - vo.x, 0);
        lc.y = Math.max(lc.y - vo.y, 0);

        if (input.useLayoutRounding) {
            lc.x = Math.round(lc.x);
            lc.y = Math.round(lc.y);
        }

        testRect.x = testRect.y = 0;
        var as = state.arrangedSize;
        Size.copyTo(as, testRect);
        if ((!tree.isTop && !Rect.isContainedIn(testRect, lc)) || !Size.isEqual(state.constrained, as)) {
            fwClip.x = fwClip.y = 0;
            fwClip.width = fwClip.height = Number.POSITIVE_INFINITY;
            helpers.coerceSize(fwClip, input);
            Rect.intersection(lc, fwClip);
        } else {
            lc.x = lc.y = lc.width = lc.height = 0;
        }

        if (!Rect.isEqual(output.layoutClip, input.layoutClip)) {
            output.dirtyFlags |= DirtyFlags.LayoutClip;
        }

        return true;
    };
}