module minerva.controls.image.arrange.tapins {
    export function calcImageBounds (input: IInput, state: IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var ib = state.imageBounds;
        ib.x = ib.y = ib.width = ib.height = 0;

        if (input.source) {
            ib.width = input.source.pixelWidth;
            ib.height = input.source.pixelHeight;
        }

        var fs = state.finalSize;
        if (ib.width === 0)
            ib.width = fs.width;
        if (ib.height === 0)
            ib.height = fs.height;

        return true;
    }
}