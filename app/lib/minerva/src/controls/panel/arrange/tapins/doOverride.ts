module minerva.controls.panel.arrange.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var cr = state.childRect;
        cr.x = cr.y = 0;
        Size.copyTo(state.finalSize, cr);

        for (var walker = tree.walk(); walker.step();) {
            walker.current.arrange(cr);
        }

        Size.copyTo(state.finalSize, state.arrangedSize);
        return true;
    }
}