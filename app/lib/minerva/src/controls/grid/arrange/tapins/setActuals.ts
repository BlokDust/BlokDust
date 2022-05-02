module minerva.controls.grid.arrange.tapins {
    export function setActuals (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        for (var coldefs = input.columnDefinitions, cm = input.gridState.colMatrix, i = 0; i < coldefs.length; i++) {
            coldefs[i].setActualWidth(cm[i][i].offered);
        }

        for (var rowdefs = input.rowDefinitions, rm = input.gridState.rowMatrix, i = 0; i < rowdefs.length; i++) {
            rowdefs[i].setActualHeight(rm[i][i].offered);
        }

        return true;
    }
}