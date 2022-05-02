module minerva.controls.virtualizingstackpanel.measure.tapins {
    export function doVertical (input: IInput, state: IState, output: IOutput, tree: virtualizingpanel.VirtualizingPanelUpdaterTree, availableSize: Size): boolean {
        if (input.orientation !== Orientation.Vertical)
            return true;

        var ca = state.childAvailable;
        var sd = input.scrollData;
        if (sd.canHorizontallyScroll)
            ca.width = Number.POSITIVE_INFINITY;

        //Dispose and remove containers that are before offset
        var index = Math.floor(sd.offsetY);
        var count = tree.containerOwner.itemCount;
        tree.containerOwner.remove(0, index);

        var viscount = 0;
        var ds = output.desiredSize;
        for (var generator = tree.containerOwner.createGenerator(index, count); generator.generate();) {
            viscount++;
            var child = generator.current;
            child.measure(ca);
            var childDesired = child.assets.desiredSize;
            ds.width = Math.max(ds.width, childDesired.width);
            ds.height += childDesired.height;
            if (ds.height > ca.height)
                break;
        }

        //Dispose and remove containers that are after visible
        tree.containerOwner.remove(index + viscount, count - (index + viscount));

        var changed = sd.extentHeight !== count
            || sd.extentWidth !== ds.width
            || sd.viewportHeight !== viscount
            || sd.viewportWidth !== ca.width;
        sd.extentHeight = count;
        sd.extentWidth = ds.width;
        sd.viewportHeight = viscount;
        sd.viewportWidth = ca.width;

        if (changed)
            sd.invalidate();

        return true;
    }
}