module Fayde.Controls.tabpanel.measure.tapins {
    export function doHorizontal (input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, availableSize: minerva.Size): boolean {
        if (input.tabAlignment !== Dock.Top && input.tabAlignment !== Dock.Bottom)
            return true;

        var ds = output.desiredSize;
        ds.width = ds.height = 0;
        output.numRows = 1;
        output.numHeaders = 0;
        output.rowHeight = 0.0;

        var count = 0;
        var totalWidth = 0.0;
        var num3 = 0.0;
        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            if (child.assets.visibility === minerva.Visibility.Collapsed)
                break;
            output.numHeaders++;
            child.measure(state.availableSize);

            var sizeWithoutMargin = helpers.getDesiredSizeWithoutMargin(child);
            if (output.rowHeight < sizeWithoutMargin.height)
                output.rowHeight = sizeWithoutMargin.height;
            if (totalWidth + sizeWithoutMargin.width > availableSize.width && count > 0) {
                if (num3 < totalWidth)
                    num3 = totalWidth;
                totalWidth = sizeWithoutMargin.width;
                count = 1;
                output.numRows++;
            }
            else {
                totalWidth += sizeWithoutMargin.width;
                count++;
            }
        }

        if (num3 < totalWidth)
            num3 = totalWidth;
        ds.height = output.rowHeight * output.numRows;
        ds.width = !isFinite(ds.width) || isNaN(ds.width) || num3 < availableSize.width ? num3 : availableSize.width;

        return true;
    }
}