module minerva.controls.grid.arrange.tapins {
    export function restoreMeasureResults (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        for (var rm = input.gridState.rowMatrix, i = 0; i < rm.length; i++) {
            for (var j = 0; j <= i; j++) {
                rm[i][j].offered = rm[i][j].original;
            }
        }

        for (var cm = input.gridState.colMatrix, i = 0; i < cm.length; i++) {
            for (var j = 0; j <= i; j++) {
                cm[i][j].offered = cm[i][j].original;
            }
        }

        return true;
    }
}