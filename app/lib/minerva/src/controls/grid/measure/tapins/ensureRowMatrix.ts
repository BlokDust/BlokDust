module minerva.controls.grid.measure.tapins {
    export function ensureRowMatrix (input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var rowCount = input.rowDefinitions.length || 1;
        var rm = input.gridState.rowMatrix;
        if (rm.length > rowCount)
            rm.splice(rowCount, rm.length - rowCount);
        for (var r = 0; r < rowCount; r++) {
            if (rm.length <= r)
                rm.push([]);
            var mrow = rm[r];
            if (mrow.length > (r + 1))
                mrow.splice(r, mrow.length - r - 1);
            for (var rr = 0; rr <= r; rr++) {
                if (mrow.length <= rr)
                    mrow.push(new Segment());
                else
                    Segment.init(mrow[rr]);
            }
        }

        return true;
    }
}