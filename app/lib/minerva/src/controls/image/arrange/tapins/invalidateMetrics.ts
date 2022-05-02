module minerva.controls.image.arrange.tapins {
    export function invalidateMetrics (input: IInput, state: IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        output.dirtyFlags |= DirtyFlags.ImageMetrics;
        return true;
    }
}