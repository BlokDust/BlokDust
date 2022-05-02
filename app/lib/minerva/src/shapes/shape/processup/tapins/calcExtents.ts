module minerva.shapes.shape.processup.tapins {
    export function calcExtents (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        output.extents.x = output.extents.y = 0;
        Size.copyTo(state.actualSize, output.extents);
        Rect.copyTo(output.extents, output.extentsWithChildren);
        return true;
    }
}