module minerva.controls.grid.measure {
    export class GridChildPlacement {
        constructor (public matrix: Segment[][], public row: number, public col: number, public size: number) {
        }

        static row (matrix: Segment[][], childShape: GridChildShape, child: core.Updater): GridChildPlacement {
            return new GridChildPlacement(matrix, childShape.row + childShape.rowspan - 1, childShape.row, child.assets.desiredSize.height);
        }

        static col (matrix: Segment[][], childShape: GridChildShape, child: core.Updater): GridChildPlacement {
            return new GridChildPlacement(matrix, childShape.col + childShape.colspan - 1, childShape.col, child.assets.desiredSize.width);
        }
    }
}