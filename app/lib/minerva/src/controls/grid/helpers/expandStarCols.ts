module minerva.controls.grid.helpers {
    export function expandStarCols (mat: Segment[][], coldefs: IColumnDefinition[], availableSize: Size) {
        var aw = availableSize.width;

        for (var i = 0; i < mat.length; i++) {
            var cur = mat[i][i];
            if (cur.type === GridUnitType.Star)
                cur.offered = 0;
            else
                aw = Math.max(aw - cur.offered, 0);
        }
        aw = assignSize(mat, 0, mat.length - 1, aw, GridUnitType.Star, false);

        for (var i = 0; i < coldefs.length; i++) {
            var cur = mat[i][i];
            if (cur.type === GridUnitType.Star)
                coldefs[i].setActualWidth(cur.offered);
        }
    }
}
