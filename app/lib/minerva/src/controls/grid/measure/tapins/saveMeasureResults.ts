module minerva.controls.grid.measure.tapins {
    export function saveMeasureResults (input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        for (var rm = input.gridState.rowMatrix, i = 0; i < rm.length; i++) {
            for (var j = 0; j <= i; j++) {
                rm[i][j].original = rm[i][j].offered;
            }
        }

        for (var cm = input.gridState.colMatrix, i = 0; i < cm.length; i++) {
            for (j = 0; j <= i; j++) {
                cm[i][j].original = cm[i][j].offered;
            }
        }

        return true;
    }
}