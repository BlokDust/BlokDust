module minerva.shapes.path.processup.tapins {
    export function calcShapeRect (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;
        //TODO: Should we calculate this without stroking?
        Rect.copyTo(input.naturalBounds, output.shapeRect);
        return true;
    }
}