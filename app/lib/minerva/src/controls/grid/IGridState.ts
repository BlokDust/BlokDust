module minerva.controls.grid {
    export interface IGridState {
        rowMatrix: Segment[][];
        colMatrix: Segment[][];
    }

    export function createGridState (): IGridState {
        return {
            rowMatrix: [],
            colMatrix: []
        };
    }
}