/// <reference path="../../GridUnitType.ts" />

module minerva.controls.grid.measure.tapins {
    var DEFAULT_GRID_LEN: IGridLength = {
        Value: 1.0,
        Type: GridUnitType.Star
    };

    export function prepareColMatrix (input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var coldefs = input.columnDefinitions;
        var cm = input.gridState.colMatrix;

        var ts = state.totalStars;
        ts.width = 0.0;

        if (coldefs.length === 0) {
            var mcell = cm[0][0];
            mcell.type = GridUnitType.Star;
            mcell.stars = 1.0;
            ts.width += 1.0;
            return true;
        }

        for (var i = 0; i < coldefs.length; i++) {
            var coldef = coldefs[i];
            var width = coldef.Width || DEFAULT_GRID_LEN;
            coldef.setActualWidth(Number.POSITIVE_INFINITY);

            var cell = Segment.init(cm[i][i], 0.0, coldef.MinWidth, coldef.MaxWidth, width.Type);
            if (width.Type === GridUnitType.Pixel) {
                cell.desired = cell.offered = cell.clamp(width.Value);
                coldef.setActualWidth(cell.desired);
            } else if (width.Type === GridUnitType.Star) {
                cell.stars = width.Value;
                ts.width += width.Value;
            } else if (width.Type === GridUnitType.Auto) {
                cell.desired = cell.offered = cell.clamp(0);
            }
        }

        return true;
    }
}