module minerva.controls.stackpanel.measure.tapins {
    export function doVertical (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean {
        if (input.orientation !== Orientation.Vertical)
            return true;

        var ca = state.childAvailable;
        ca.width = state.availableSize.width;
        var width = input.width;
        if (!isNaN(width))
            ca.width = width;
        ca.width = Math.max(Math.min(ca.width, input.maxWidth), input.minWidth);

        var desired = output.desiredSize;
        for (var walker = tree.walk(), child: core.Updater, childDesired: Size; walker.step();) {
            child = walker.current;
            child.measure(ca);
            childDesired = child.assets.desiredSize;

            desired.height += childDesired.height;
            desired.width = Math.max(desired.width, childDesired.width);
        }

        return true;
    }
}