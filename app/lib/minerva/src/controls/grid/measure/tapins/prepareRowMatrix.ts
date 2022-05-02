module minerva.controls.grid.measure.tapins {
    var DEFAULT_GRID_LEN: IGridLength = {
        Value: 1.0,
        Type: GridUnitType.Star
    };

    export function prepareRowMatrix (input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var rowdefs = input.rowDefinitions;
        var rm = input.gridState.rowMatrix;

        var ts = state.totalStars;
        ts.height = 0.0;

        if (rowdefs.length === 0) {
            var mcell = rm[0][0];
            mcell.type = GridUnitType.Star;
            mcell.stars = 1.0;
            ts.height += 1.0;
            return true;
        }

        for (var i = 0; i < rowdefs.length; i++) {
            var rowdef = rowdefs[i];
            var height = rowdef.Height || DEFAULT_GRID_LEN;
            rowdef.setActualHeight(Number.POSITIVE_INFINITY);

            var cell = Segment.init(rm[i][i], 0.0, rowdef.MinHeight, rowdef.MaxHeight, height.Type);
            if (height.Type === GridUnitType.Pixel) {
                cell.desired = cell.offered = cell.clamp(height.Value);
                rowdef.setActualHeight(cell.desired);
            } else if (height.Type === GridUnitType.Star) {
                cell.stars = height.Value;
                ts.height += height.Value;
            } else if (height.Type === GridUnitType.Auto) {
                cell.desired = cell.offered = cell.clamp(0);
            }
        }

        return true;
    }
}