module Fayde.Controls.wrappanel.measure.tapins {
    import Size = minerva.Size;

    export function doVertical (input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, availableSize: Size): boolean {
        if (input.orientation !== Orientation.Vertical)
            return true;

        var as = state.availableSize;
        if (!isNaN(input.width))
            as.width = input.width;
        as.width = Math.min(as.width, input.maxWidth);
        as.width = Math.max(as.width, input.minWidth);

        var ds = output.desiredSize;
        ds.width = ds.height = 0;

        var colWidth = 0;
        var offsetX = 0;
        var offsetY = 0;
        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            //TODO: We should coerce width/height before measure
            helpers.coerceChildSize(child, input.itemWidth, input.itemHeight);
            child.measure(as);

            var childDesired = child.assets.desiredSize;
            if (as.height < (offsetY + childDesired.height)) {  // needs to start another col
                offsetX += colWidth;
                offsetY = 0; //reset offsetY to 0
                colWidth = 0; //reset col spacing
            }
            colWidth = Math.max(colWidth, childDesired.width);

            ds.height = Math.max(ds.height, offsetY + childDesired.height);
            ds.width = Math.max(ds.width, offsetX + childDesired.width);
            offsetY += childDesired.height;
        }

        return true;
    }
}