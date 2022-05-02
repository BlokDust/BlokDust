module minerva.controls.usercontrol.measure.tapins {
    export function postOverride (input: IInput, state: IState, output: core.measure.IOutput, tree: control.ControlUpdaterTree, availableSize: Size): boolean {
        Thickness.growSize(state.totalBorder, output.desiredSize);
        Size.min(output.desiredSize, state.availableSize);
        return true;
    }
}