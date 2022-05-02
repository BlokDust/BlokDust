module minerva.controls.grid.measure.tapins {
    export function buildShape (input: IInput, state: IState, output: panel.measure.IOutput, tree: panel.PanelUpdaterTree, finalRect: Rect): boolean {
        var shapes = state.childShapes;
        var cm = input.gridState.colMatrix;
        var rm = input.gridState.rowMatrix;
        for (var walker = tree.walk(), i = 0; walker.step(); i++) {
            if (i > shapes.length)
                shapes.push(new GridChildShape().init(walker.current, rm, cm));
            else
                (shapes[i] = shapes[i] || new GridChildShape()).init(walker.current, rm, cm);
        }
        if (i < shapes.length)
            shapes.slice(i, shapes.length - i);

        state.gridShape.init(state.childShapes);

        state.placements.length = 0;
        state.placements.push(new GridChildPlacement(null, 0, 0, 0));
        state.placementIndex = 0;

        return true;
    }
}