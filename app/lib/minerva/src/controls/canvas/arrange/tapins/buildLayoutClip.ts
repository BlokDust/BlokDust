module minerva.controls.canvas.arrange.tapins {
    export function buildLayoutClip (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var lc = output.layoutClip;
        lc.x = lc.y = lc.width = lc.height = 0;
        return true;
    }
}