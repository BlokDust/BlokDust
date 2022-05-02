module minerva.controls.panel.processup.tapins {
    export function preCalcExtents (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;
        if (!input.background) {
            var as = state.actualSize;
            as.width = as.height = 0;
        }
        return true;
    }
}