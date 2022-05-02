module minerva.controls.image.processdown.tapins {
    export function calcOverlap (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        if (!state.calcImageMetrics)
            return true;

        if (input.stretch === Stretch.UniformToFill || state.imgAdjust) {
            var paint = state.paintRect;
            Rect.roundOut(paint);

            var imgRect = state.imgRect;
            Rect.transform(imgRect, output.imgXform);
            Rect.roundIn(imgRect);

            output.overlap = Rect.rectIn(paint, imgRect);
        }

        return true;
    }
}