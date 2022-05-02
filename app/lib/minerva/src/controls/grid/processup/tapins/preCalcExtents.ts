module minerva.controls.grid.processup.tapins {
    export function preCalcExtents (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;
        if (!input.background && !input.showGridLines) {
            var as = state.actualSize;
            as.width = as.height = 0;
        }
        return true;
    }
}