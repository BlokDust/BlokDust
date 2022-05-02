module minerva.controls.virtualizingstackpanel.arrange.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var cr = state.childRect;
        cr.x = cr.y = 0;
        Size.copyTo(state.finalSize, cr);
        Size.copyTo(state.finalSize, state.arrangedSize);
        return true;
    }
}