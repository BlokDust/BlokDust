module minerva.controls.image.processdown.tapins {
    export function calcImageTransform (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if (!state.calcImageMetrics)
            return true;

        var w = state.paintRect.width;
        var h = state.paintRect.height;
        var sw = state.imgRect.width;
        var sh = state.imgRect.height;

        var sx = w / sw;
        var sy = h / sh;
        if (w === 0)
            sx = 1.0;
        if (h === 0)
            sy = 1.0;

        var xform = output.imgXform;
        if (input.stretch === Stretch.Fill) {
            mat3.createScale(sx, sy, xform);
            return true;
        }

        var scale = 1.0;
        switch (input.stretch) {
            case Stretch.Uniform:
                scale = sx < sy ? sx : sy;
                break;
            case Stretch.UniformToFill:
                scale = sx < sy ? sy : sx;
                break;
            case Stretch.None:
                break;
        }

        //AlignmentX.Center
        var dx = (w - (scale * sw)) / 2;
        //AlignmentY.Center
        var dy = (h - (scale * sh)) / 2;

        mat3.createScale(scale, scale, xform);
        mat3.translate(xform, dx, dy);

        return true;
    }
}