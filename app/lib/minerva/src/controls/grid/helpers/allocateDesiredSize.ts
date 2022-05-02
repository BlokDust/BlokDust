module minerva.controls.grid.helpers {
    export function allocateDesiredSize (rowMat: Segment[][], colMat: Segment[][]) {
        for (var i = 0; i < 2; i++) {
            var matrix = i === 0 ? rowMat : colMat;
            var count = matrix.length;

            for (var row = count - 1; row >= 0; row--) {
                for (var col = row; col >= 0; col--) {
                    var spansStar = false;
                    for (var j = row; j >= col; j--) {
                        spansStar = spansStar || (matrix[j][j].type === GridUnitType.Star);
                    }
                    var current = matrix[row][col].desired;
                    var totalAllocated = 0;
                    for (var a = row; a >= col; a--) {
                        totalAllocated += matrix[a][a].desired;
                    }
                    if (totalAllocated < current) {
                        var additional = current - totalAllocated;
                        if (spansStar) {
                            additional = assignSize(matrix, col, row, additional, GridUnitType.Star, true);
                        } else {
                            additional = assignSize(matrix, col, row, additional, GridUnitType.Pixel, true);
                            additional = assignSize(matrix, col, row, additional, GridUnitType.Auto, true);
                        }
                    }
                }
            }
        }
        for (var i = 0; i < rowMat.length; i++) {
            rowMat[i][i].offered = rowMat[i][i].desired;
        }
        for (var i = 0; i < matrix.length; i++) {
            colMat[i][i].offered = colMat[i][i].desired;
        }
    }
}