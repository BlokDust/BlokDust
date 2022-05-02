module minerva.controls.grid.arrange.tapins {
    export function calcConsumed (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var con = state.consumed;
        con.width = con.height = 0;
        var fs = state.finalSize;

        var cm = input.gridState.colMatrix;
        for (var i = 0; i < cm.length; i++) {
            con.width += (cm[i][i].offered = cm[i][i].desired);
        }
        var rm = input.gridState.rowMatrix;
        for (var i = 0; i < rm.length; i++) {
            con.height += (rm[i][i].offered = rm[i][i].desired);
        }

        if (con.width !== fs.width)
            helpers.expandStarCols(cm, input.columnDefinitions, fs);
        if (con.height !== fs.height)
            helpers.expandStarRows(rm, input.rowDefinitions, fs);

        return true;
    }
}