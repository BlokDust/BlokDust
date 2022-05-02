module minerva.controls.image.arrange.tapins {
    export function calcStretch (input: IInput, state: IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var ib = state.imageBounds;

        var sx = 1.0;
        var sy = 1.0;

        var fs = state.finalSize;
        if (ib.width !== fs.width)
            sx = fs.width / ib.width;
        if (ib.height !== fs.height)
            sy = fs.height / ib.height;

        switch (input.stretch) {
            case Stretch.Uniform:
                sx = sy = Math.min(sx, sy);
                break;
            case Stretch.UniformToFill:
                sx = sy = Math.max(sx, sy);
                break;
            case Stretch.None:
                sx = sy = 1.0;
                break;
            case Stretch.Fill:
            default:
                break;
        }

        state.stretchX = sx;
        state.stretchY = sy;

        return true;
    }
}