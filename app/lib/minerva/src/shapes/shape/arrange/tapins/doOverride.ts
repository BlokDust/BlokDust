module minerva.shapes.shape.arrange.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree) {
        var arranged = state.arrangedSize;
        Size.copyTo(state.finalSize, arranged);
        var nb = input.naturalBounds;
        if (input.stretch === Stretch.None) {
            arranged.width = Math.max(arranged.width, nb.x + nb.width);
            arranged.height = Math.max(arranged.height, nb.y + nb.height);
            return true;
        }

        if (nb.width === 0)
            nb.width = arranged.width;
        if (nb.height === 0)
            nb.height = arranged.height;

        var sx = 1.0,
            sy = 1.0;
        if (nb.width !== arranged.width)
            sx = arranged.width / nb.width;
        if (nb.height !== arranged.height)
            sy = arranged.height / nb.height;


        switch (input.stretch) {
            case Stretch.Uniform:
                sx = sy = Math.min(sx, sy);
                break;
            case Stretch.UniformToFill:
                sx = sy = Math.max(sx, sy);
                break;
        }

        arranged.width = (nb.width * sx) || 0;
        arranged.height = (nb.height * sy) || 0;

        return true;
    }
}