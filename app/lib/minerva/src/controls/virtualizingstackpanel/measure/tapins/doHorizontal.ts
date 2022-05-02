module minerva.controls.virtualizingstackpanel.measure.tapins {
    export function doHorizontal (input: IInput, state: IState, output: IOutput, tree: virtualizingpanel.VirtualizingPanelUpdaterTree, availableSize: Size): boolean {
        if (input.orientation !== Orientation.Horizontal)
            return true;

        var ca = state.childAvailable;
        var sd = input.scrollData;
        if (sd.canVerticallyScroll)
            ca.height = Number.POSITIVE_INFINITY;

        //Dispose and remove containers that are before offset
        var index = Math.floor(sd.offsetX);
        var count = tree.containerOwner.itemCount;
        tree.containerOwner.remove(0, index);

        var viscount = 0;
        var ds = output.desiredSize;
        for (var generator = tree.containerOwner.createGenerator(index, count); generator.generate();) {
            viscount++;
            var child = generator.current;
            child.measure(ca);
            var childDesired = child.assets.desiredSize;
            ds.height = Math.max(ds.height, childDesired.height);
            ds.width += childDesired.width;
            if (ds.width > ca.width)
                break;
        }

        //Dispose and remove containers that are after visible
        tree.containerOwner.remove(index + viscount, count - (index + viscount));

        var changed = sd.extentHeight !== ds.height
            || sd.extentWidth !== count
            || sd.viewportHeight !== ca.height
            || sd.viewportWidth !== viscount;
        sd.extentHeight = ds.height;
        sd.extentWidth = count;
        sd.viewportHeight = ca.height;
        sd.viewportWidth = viscount;

        if (changed)
            sd.invalidate();

        return true;
    }
}