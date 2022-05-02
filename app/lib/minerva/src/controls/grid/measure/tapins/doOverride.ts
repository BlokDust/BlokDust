module minerva.controls.grid.measure.tapins {
    export function doOverride (input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var desired = output.desiredSize;
        desired.width = desired.height = 0;
        for (var cm = input.gridState.colMatrix, i = 0; i < cm.length; i++) {
            desired.width += cm[i][i].desired;
        }
        for (var rm = input.gridState.rowMatrix, i = 0; i < rm.length; i++) {
            desired.height += rm[i][i].desired;
        }
        return true;
    }
}