module Fayde.Controls.wrappanel.measure.tapins {
    import Size = minerva.Size;

    export function doHorizontal (input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, availableSize: Size): boolean {
        if (input.orientation !== Orientation.Horizontal)
            return true;

        var as = state.availableSize;
        if (!isNaN(input.height))
            as.height = input.height;
        as.height = Math.min(as.height, input.maxHeight);
        as.height = Math.max(as.height, input.minHeight);

        var ds = output.desiredSize;
        ds.width = ds.height = 0;

        var rowHeight = 0;
        var offsetX = 0;
        var offsetY = 0;
        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            //TODO: We should coerce width/height before measure
            helpers.coerceChildSize(child, input.itemWidth, input.itemHeight);
            child.measure(as);

            var childDesired = child.assets.desiredSize;
            if (as.width < (offsetX + childDesired.width)) {  // needs to start another row
                offsetX = 0;  // reset offsetX to 0
                offsetY += rowHeight;
                rowHeight = 0;  //reset row height
            }
            rowHeight = Math.max(rowHeight, childDesired.height);

            ds.height = Math.max(ds.height, offsetY + childDesired.height);
            ds.width = Math.max(ds.width, offsetX + childDesired.width);
            offsetX += childDesired.width;
        }

        return true;
    }
}