module minerva.controls.stackpanel.measure.tapins {
    export function doHorizontal (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean {
        if (input.orientation !== Orientation.Horizontal)
            return true;

        var ca = state.childAvailable;
        ca.height = state.availableSize.height;
        var height = input.height;
        if (!isNaN(height))
            ca.height = height;
        ca.height = Math.max(Math.min(ca.height, input.maxHeight), input.minHeight);

        var desired = output.desiredSize;
        for (var walker = tree.walk(), child: core.Updater, childDesired: Size; walker.step();) {
            child = walker.current;
            child.measure(ca);
            childDesired = child.assets.desiredSize;

            desired.width += childDesired.width;
            desired.height = Math.max(desired.height, childDesired.height);
        }

        return true;
    }
}