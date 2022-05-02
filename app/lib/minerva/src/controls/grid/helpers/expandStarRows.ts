module minerva.controls.grid.helpers {
    export function expandStarRows (mat: Segment[][], rowdefs: IRowDefinition[], availableSize: Size) {
        var ah = availableSize.height;

        for (var i = 0; i < mat.length; i++) {
            var cur = mat[i][i];
            if (cur.type === GridUnitType.Star)
                cur.offered = 0;
            else
                ah = Math.max(ah - cur.offered, 0);
        }
        ah = assignSize(mat, 0, mat.length - 1, ah, GridUnitType.Star, false);

        for (var i = 0; i < rowdefs.length; i++) {
            var cur = mat[i][i];
            if (cur.type === GridUnitType.Star)
                rowdefs[i].setActualHeight(cur.offered);
        }
    }
}