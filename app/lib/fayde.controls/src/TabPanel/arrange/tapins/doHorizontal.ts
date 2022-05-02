module Fayde.Controls.tabpanel.arrange.tapins {
    import Size = minerva.Size;
    import Rect = minerva.Rect;
    import Point = minerva.Point;

    export function doHorizontal (input: IInput, state: IState, output: IOutput, tree: minerva.controls.panel.PanelUpdaterTree, finalRect: minerva.Rect): boolean {
        if (input.tabAlignment !== Dock.Top && input.tabAlignment !== Dock.Bottom)
            return true;

        var fs = state.finalSize;

        var isMultiRow = input.numRows > 1;
        var activeRow = 0;
        var solution: number[] = [];
        var childOffset = new Point();
        var headersSize = helpers.getHeadersSize(tree);
        if (isMultiRow) {
            solution = helpers.calculateHeaderDistribution(tree, fs.width, headersSize);
            activeRow = helpers.getActiveRow(tree, solution, input.tabAlignment === Dock.Top);
            if (input.tabAlignment === Dock.Top)
                childOffset.y = (input.numRows - 1.0 - activeRow) * input.rowHeight;
            if (input.tabAlignment === Dock.Bottom && activeRow !== 0)
                childOffset.y = (input.numRows - activeRow) * input.rowHeight;
        }

        var cr = state.childRect;
        cr.x = cr.y = cr.width = cr.height = 0;
        cr.height = input.rowHeight;

        var childIndex = 0;
        var separatorIndex = 0;
        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            if (child.assets.visibility === minerva.Visibility.Collapsed)
                continue;

            cr.width = headersSize[childIndex];
            cr.height = input.rowHeight;
            var isLastHeaderInRow = isMultiRow && (separatorIndex < solution.length && solution[separatorIndex] === childIndex || childIndex === (input.numHeaders - 1));
            if (isLastHeaderInRow)
                cr.width = fs.width - childOffset.x;
            child.arrange(cr);

            cr.x += cr.width;
            if (isLastHeaderInRow) {
                if ((separatorIndex === activeRow && input.tabAlignment === Dock.Top) ||
                    (separatorIndex === activeRow - 1 && input.tabAlignment === Dock.Bottom))
                    childOffset.y = 0;
                else
                    childOffset.y += input.rowHeight;

                childOffset.x = 0;
                separatorIndex++;
            }
            childIndex++;
        }

        return true;
    }
}