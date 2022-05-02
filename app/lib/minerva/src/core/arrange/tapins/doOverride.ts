module minerva.core.arrange.tapins {
    export var doOverride: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        var cr = state.childRect;
        cr.x = cr.y = 0;
        Size.copyTo(state.finalSize, cr);

        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            child.arrange(state.childRect);
        }

        Size.copyTo(cr, state.arrangedSize);
        return true;
    };
}