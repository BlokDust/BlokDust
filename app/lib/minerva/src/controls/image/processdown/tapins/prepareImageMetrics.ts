module minerva.controls.image.processdown.tapins {
    export function prepareImageMetrics (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if (!state.calcImageMetrics)
            return true;

        var imgRect = state.imgRect;
        imgRect.x = imgRect.y = 0;

        var source = input.source;
        imgRect.width = source.pixelWidth;
        imgRect.height = source.pixelHeight;

        var paintRect = state.paintRect;
        paintRect.x = paintRect.y = 0;
        paintRect.width = input.actualWidth;
        paintRect.height = input.actualHeight;

        /*
        See note below
        var stretched = state.stretched;
        Size.copyTo(paintRect, stretched);
        */

        state.imgAdjust = !Size.isEqual(paintRect, input.renderSize);

        /*
         Removing `stretched` since actualWidth, actualHeight should already be coerced
        core.helpers.coerceSize(stretched, input);
        if (input.stretch !== Stretch.UniformToFill) {
            paintRect.width = Math.min(paintRect.width, stretched.width);
            paintRect.height = Math.min(paintRect.height, stretched.height);
        }
        */

        if (input.stretch === Stretch.None)
            Rect.union(paintRect, imgRect);

        return true;
    }
}