module minerva.controls.grid.measure.tapins {
    export function createDoOverridePass (pass: OverridePass) {
        return function doOverridePass (input: IInput, state: IState, output: panel.measure.IOutput, tree: panel.PanelUpdaterTree, finalRect: Rect): boolean {
            var rm = input.gridState.rowMatrix;
            var cm = input.gridState.colMatrix;

            if (tree.children.length > 0) {
                helpers.expandStarCols(cm, input.columnDefinitions, state.availableSize);
                helpers.expandStarRows(rm, input.rowDefinitions, state.availableSize);
            }

            var placements = state.placements;
            var placement: GridChildPlacement;
            var separator = placements[0];

            var shapes = state.childShapes;
            var childSize = state.childSize;
            for (var walker = tree.walk(), i = 0; walker.step(); i++) {
                var child = walker.current;
                var childShape = shapes[i];
                if (!childShape.shouldMeasurePass(state.gridShape, childSize, pass))
                    continue;
                childShape.size(childSize, rm, cm);
                child.measure(childSize);

                if (pass !== OverridePass.StarAuto) {
                    placement = GridChildPlacement.row(rm, childShape, child);
                    if (placement.row === placement.col) {
                        placements.splice(state.placementIndex + 1, 0, placement);
                    } else {
                        placements.splice(state.placementIndex, 0, placement);
                        state.placementIndex++;
                    }
                }

                placement = GridChildPlacement.col(cm, childShape, child);
                if (placement.row === placement.col) {
                    placements.splice(state.placementIndex + 1, 0, placement);
                } else {
                    placements.splice(state.placementIndex, 0, placement);
                    state.placementIndex++;
                }
            }

            placements.splice(state.placementIndex, 1);
            state.placementIndex = -1;

            while (placement = placements.pop()) {
                var cell = placement.matrix[placement.row][placement.col];
                cell.desired = Math.max(cell.desired, placement.size);
                helpers.allocateDesiredSize(rm, cm);
            }
            state.placementIndex = placements.push(separator) - 1;

            return true;
        };
    }
}