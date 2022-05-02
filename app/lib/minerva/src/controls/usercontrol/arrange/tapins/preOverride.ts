module minerva.controls.usercontrol.arrange.tapins {
    export function preOverride (input: IInput, state: IState, output: core.arrange.IOutput, tree: control.ControlUpdaterTree, availableSize: Size): boolean {
        if (!tree.subtree)
            return true;
        var tb = state.totalBorder;
        Thickness.copyTo(input.padding, tb);
        Thickness.add(tb, input.borderThickness);

        var cr = state.childRect;
        cr.x = cr.y = 0;
        Size.copyTo(state.finalSize, cr);
        Thickness.shrinkSize(tb, cr);
        return true;
    }
}