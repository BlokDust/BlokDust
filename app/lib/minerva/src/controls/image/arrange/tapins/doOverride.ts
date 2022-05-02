module minerva.controls.image.arrange.tapins {
    export function doOverride (input: IInput, state: IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var as = state.arrangedSize;
        as.width = state.imageBounds.width * state.stretchX;
        as.height = state.imageBounds.height * state.stretchY;
        return true;
    }
}