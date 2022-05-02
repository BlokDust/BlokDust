module minerva.shapes.shape.processup.tapins {
    export function calcShapeRect (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        var sr = output.shapeRect;
        sr.x = sr.y = 0;
        Size.copyTo(state.actualSize, sr);

        output.shapeFlags = ShapeFlags.Empty;
        if (Rect.isEmpty(sr))
            return true;

        var t = !!input.stroke ? input.strokeThickness : 0.0;
        if (t >= sr.width || t >= sr.height) {
            sr.width = Math.max(sr.width, t + t * 0.001);
            sr.height = Math.max(sr.height, t + t * 0.001);
            output.shapeFlags = ShapeFlags.Degenerate;
        } else {
            output.shapeFlags = ShapeFlags.Normal;
        }

        var ht = t / 2;
        Rect.shrink(sr, ht, ht, ht, ht);

        return true;
    }
}