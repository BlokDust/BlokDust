module minerva.shapes.path.processup.tapins {
    export function calcExtents (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        if (Size.isEmpty(state.actualSize)) {
            Rect.clear(output.extents);
        } else {
            Rect.copyTo(output.shapeRect, output.extents);
            Rect.transform(output.extents, output.stretchXform);
        }
        Rect.copyTo(output.extents, output.extentsWithChildren);
        return true;
    }
}