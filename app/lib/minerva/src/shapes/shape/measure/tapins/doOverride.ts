module minerva.shapes.shape.measure.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree) {
        var ds = output.desiredSize;
        var nb = output.naturalBounds;
        if (input.stretch === Stretch.None) {
            ds.width = nb.x + nb.width;
            ds.height = nb.y + nb.height;
            return true;
        }

        var available = state.availableSize;
        Size.copyTo(available, ds);
        if (!isFinite(available.width))
            ds.width = nb.width;
        if (!isFinite(available.height))
            ds.height = nb.height;

        var sx = 0,
            sy = 0;
        if (nb.width > 0)
            sx = ds.width / nb.width;
        if (nb.height > 0)
            sy = ds.height / nb.height;

        if (!isFinite(available.width))
            sx = sy;
        if (!isFinite(available.height))
            sy = sx;

        switch (input.stretch) {
            case Stretch.Uniform:
                sx = sy = Math.min(sx, sy);
                break;
            case Stretch.UniformToFill:
                sx = sy = Math.max(sx, sy);
                break;
            case Stretch.Fill:
                if (!isFinite(available.width))
                    sx = 1.0;
                if (!isFinite(available.height))
                    sy = 1.0;
                break;
        }

        ds.width = nb.width * sx;
        ds.height = nb.height * sy;

        return true;
    }
}