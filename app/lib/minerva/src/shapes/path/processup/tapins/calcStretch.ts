module minerva.shapes.path.processup.tapins {
    export function calcStretch (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        var xform = mat3.identity(output.stretchXform);
        var actual = state.actualSize;
        if (Size.isEmpty(actual) || input.stretch === Stretch.None)
            return true;

        var shapeRect = output.shapeRect;
        var sx = actual.width / shapeRect.width;
        var sy = actual.height / shapeRect.height;
        var xp = 0;
        var yp = 0;
        switch (input.stretch) {
            case Stretch.Uniform:
                sx = sy = Math.min(sx, sy);
                xp = (actual.width - (shapeRect.width * sx)) / 2.0;
                yp = (actual.height - (shapeRect.height * sy)) / 2.0;
                break;
            case Stretch.UniformToFill:
                sx = sy = Math.max(sx, sy);
                break;
        }

        mat3.translate(xform, -shapeRect.x, -shapeRect.y);
        mat3.scale(xform, sx, sy);
        mat3.translate(xform, xp, yp);

        return true;
    }
}