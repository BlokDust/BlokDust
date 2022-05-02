module minerva.controls.usercontrol.arrange.tapins {
    export function doOverride (input: IInput, state: IState, output: core.arrange.IOutput, tree: control.ControlUpdaterTree, finalRect: Rect): boolean {
        if (tree.subtree)
            tree.subtree.arrange(state.childRect);

        Size.copyTo(state.finalSize, state.arrangedSize);
        return true;
    }
}