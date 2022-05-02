module minerva.controls.grid.measure.tapins {
    export function ensureColMatrix (input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var colCount = input.columnDefinitions.length || 1;
        var cm = input.gridState.colMatrix;
        if (cm.length > colCount)
            cm.splice(colCount, cm.length - colCount);
        for (var c = 0; c < colCount; c++) {
            if (cm.length <= c)
                cm.push([]);
            var mrow = cm[c];
            if (mrow.length > c)
                mrow.splice(c, mrow.length - c);
            for (var cc = 0; cc <= c; cc++) {
                if (mrow.length <= cc)
                    mrow.push(new Segment());
                else
                    Segment.init(mrow[cc]);
            }
        }

        return true;
    }
}