module minerva.controls.image.measure.tapins {
    export function calcStretch (input: IInput, state: IState, output: core.measure.IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean {
        var as = state.availableSize;
        var dw = as.width;
        var dh = as.height;
        var ib = state.imageBounds;

        if (!isFinite(dw))
            dw = ib.width;
        if (!isFinite(dh))
            dh = ib.height;

        var sx = 0.0;
        var sy = 0.0;
        if (ib.width > 0)
            sx = dw / ib.width;
        if (ib.height > 0)
            sy = dh / ib.height;

        if (!isFinite(as.width))
            sx = sy;
        if (!isFinite(as.height))
            sy = sx;

        switch (input.stretch) {
            default:
            case Stretch.Uniform:
                sx = sy = Math.min(sx, sy);
                break;
            case Stretch.UniformToFill:
                sx = sy = Math.max(sx, sy);
                break;
            case Stretch.Fill:
                if (!isFinite(as.width))
                    sx = sy;
                if (!isFinite(as.height))
                    sy = sx;
                break;
            case Stretch.None:
                sx = sy = 1.0;
                break;
        }

        state.stretchX = sx;
        state.stretchY = sy;
        return true;
    }
}