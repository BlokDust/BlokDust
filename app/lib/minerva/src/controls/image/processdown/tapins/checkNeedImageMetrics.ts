module minerva.controls.image.processdown.tapins {
    export function checkNeedImageMetrics (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean {
        state.calcImageMetrics = false;
        if ((input.dirtyFlags & DirtyFlags.ImageMetrics) === 0)
            return true;

        mat3.identity(output.imgXform);
        output.overlap = RectOverlap.In;

        var imgRect = state.imgRect;
        imgRect.x = imgRect.y = imgRect.width = imgRect.height = 0;

        state.calcImageMetrics = !!input.source;
        return true;
    }
}