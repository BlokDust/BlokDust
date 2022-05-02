module minerva.controls.usercontrol.measure.tapins {
    export function preOverride (input: IInput, state: IState, output: core.measure.IOutput, tree: control.ControlUpdaterTree, availableSize: Size): boolean {
        var tb = state.totalBorder;
        Thickness.copyTo(input.padding, tb);
        Thickness.add(tb, input.borderThickness);
        Thickness.shrinkSize(tb, state.availableSize);
        return true;
    }
}