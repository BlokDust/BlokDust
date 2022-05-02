module minerva.shapes.path.processup.tapins {
    export function calcActualSize (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean {
        if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
            return true;

        var actual = state.actualSize;
        actual.width = input.actualWidth;
        actual.height = input.actualHeight;

        var natural = input.naturalBounds;
        if ((natural.width <= 0.0 || natural.height <= 0) || (input.width <= 0.0 || input.height <= 0.0)) {
            actual.width = 0.0;
            actual.height = 0.0;
            return true;
        }

        if (tree.visualParent instanceof controls.canvas.CanvasUpdater) {
            actual.width = actual.width === 0.0 ? natural.width : actual.width;
            actual.height = actual.height === 0.0 ? natural.height : actual.height;
            if (!isNaN(input.width))
                actual.width = input.width;
            if (!isNaN(input.height))
                actual.height = input.height;
        }

        return true;
    }
}