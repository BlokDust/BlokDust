module minerva.controls.grid.arrange.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var cr = state.childRect;

        var rm = input.gridState.rowMatrix;
        var cm = input.gridState.colMatrix;

        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;

            var col = Math.min(child.getAttachedValue("Grid.Column"), cm.length - 1);
            if (isNaN(col))
                col = 0;
            var row = Math.min(child.getAttachedValue("Grid.Row"), rm.length - 1);
            if (isNaN(row))
                row = 0;
            var colspan = Math.min(child.getAttachedValue("Grid.ColumnSpan"), cm.length - col);
            if (isNaN(colspan))
                colspan = 1;
            var rowspan = Math.min(child.getAttachedValue("Grid.RowSpan"), rm.length - row);
            if (isNaN(rowspan))
                rowspan = 1;

            cr.x = cr.y = cr.width = cr.height = 0;
            for (var i = 0; i < col; i++) {
                cr.x += cm[i][i].offered;
            }
            for (var i = col; i < col + colspan; i++) {
                cr.width += cm[i][i].offered;
            }
            for (var i = 0; i < row; i++) {
                cr.y += rm[i][i].offered;
            }
            for (var i = row; i < row + rowspan; i++) {
                cr.height += rm[i][i].offered;
            }

            child.arrange(cr);
        }

        Size.copyTo(state.finalSize, state.arrangedSize);
        return true;
    }
}